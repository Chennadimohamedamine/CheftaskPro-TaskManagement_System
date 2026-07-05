 

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Project, User, Comment, TeamMember } from '../../database/entities'; 
import { Role, TaskStatus, TaskPriority } from '../../common/enums'; 
import { checkOwnership } from '../../common/guards'; 
import { MailService } from '../mail/mail.service'; 
import { NotificationService } from '../notifications/notifications.service'; 
import { AuditLogService } from '../audit-logs/audit-logs.service'; 

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(Project)
    private readonly projRepo: Repository<Project>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,

    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,

    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly auditLogsService: AuditLogService,
  ) {}

  // --- Create Task ---
  async createTask(
    title: string,
    description: string | null,
    priority: TaskPriority,
    dueDate: string | null,
    projectId: number,
    assigneeId: number | null,
    chef: User
  ): Promise<Task> {
    const project = await this.projRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    checkOwnership(chef, project.chefId);

    if (assigneeId) {
      const dev = await this.userRepo.findOne({ where: { id: assigneeId, role: Role.DEVELOPER } });
      if (!dev) {
        throw new Error('Assignee developer not found');
      }
      if (chef.role === Role.CHEF_PROJET && dev.createdById !== chef.id) {
        throw new Error('This developer is not under your management');
      }
    }

    const task = new Task();
    task.title = title;
    task.description = description;
    task.status = TaskStatus.TODO;
    task.priority = priority;
    task.dueDate = dueDate;
    task.projectId = projectId;
    task.assigneeId = assigneeId;
    task.createdAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.log(chef.id, 'task_created', 'task', saved.id, { title, priority });

    if (assigneeId) {
      await this.notifyAssignee(saved, project, assigneeId);
    }

    return saved;
  }

  // --- Update Task ---
  async updateTask(
    taskId: number,
    fields: Partial<{ title: string; description: string | null; status: TaskStatus; priority: TaskPriority; dueDate: string | null; assigneeId: number | null }>,
    actor: User
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const project = await this.projRepo.findOne({ where: { id: task.projectId } });
    if (!project) {
      throw new Error('Associated Project not found');
    }

    if (actor.role === Role.DEVELOPER) {
      if (task.assigneeId !== actor.id) {
        throw new Error('Forbidden: You can only update tasks assigned directly to you.');
      }
      const allowedKeys = ['status'];
      const updatedKeys = Object.keys(fields);
      const isStatusOnly = updatedKeys.length === 1 && updatedKeys[0] === 'status';

      if (!isStatusOnly) {
        throw new Error('Forbidden: Developers can only modify the task status.');
      }

      const oldStatus = task.status;
      task.status = fields.status!;
      task.updatedAt = new Date().toISOString();

      const updated = await this.taskRepo.save(task);

      if (fields.status === TaskStatus.DONE && oldStatus !== TaskStatus.DONE) {
        const message = `Developer ${actor.fullName} completed task "${task.title}" in project "${project.title}".`;
        await this.notificationService.createNotification(project.chefId, 'task_assigned', message);
      }

      await this.auditLogsService.log(actor.id, 'task_status_updated', 'task', task.id, {
        title: task.title,
        status: task.status
      });

      return updated;
    }

    checkOwnership(actor, project.chefId);

    const oldAssigneeId = task.assigneeId;

    if (fields.title !== undefined) task.title = fields.title;
    if (fields.description !== undefined) task.description = fields.description;
    if (fields.status !== undefined) task.status = fields.status;
    if (fields.priority !== undefined) task.priority = fields.priority;
    if (fields.dueDate !== undefined) task.dueDate = fields.dueDate;
    
    if (fields.assigneeId !== undefined) {
      if (fields.assigneeId) {
        const dev = await this.userRepo.findOne({ where: { id: fields.assigneeId, role: Role.DEVELOPER } });
        if (!dev) {
          throw new Error('Assignee developer not found');
        }
        if (actor.role === Role.CHEF_PROJET && dev.createdById !== actor.id) {
          throw new Error('This developer is not under your management');
        }
      }
      task.assigneeId = fields.assigneeId;
    }

    task.updatedAt = new Date().toISOString();
    const updated = await this.taskRepo.save(task);

    if (fields.assigneeId !== undefined && fields.assigneeId !== oldAssigneeId && fields.assigneeId) {
      await this.notifyAssignee(updated, project, fields.assigneeId);
    }

    await this.auditLogsService.log(actor.id, 'task_updated', 'task', updated.id, {
      title: updated.title,
      status: updated.status
    });

    return updated;
  }

  // Helper to notify assignee
  private async notifyAssignee(task: Task, project: Project, assigneeId: number) {
    const dev = await this.userRepo.findOne({ where: { id: assigneeId } });
    if (!dev) return;

    const message = `You have been assigned a new task: "${task.title}" in project "${project.title}". Due date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}`;
    
    await this.notificationService.createNotification(assigneeId, 'task_assigned', message);

    const taskUrl = `${APP_URL}/tasks/${task.id}`;
    await this.mailService.sendTaskAssigned(dev.email, task.title, project.title, task.dueDate, taskUrl);
  }

  // --- Delete Task ---
  async deleteTask(taskId: number, actor: User): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const project = await this.projRepo.findOne({ where: { id: task.projectId } });
    if (!project) {
      throw new Error('Associated Project not found');
    }

    checkOwnership(actor, project.chefId);

    await this.commentRepo.delete({ taskId });
    await this.taskRepo.remove(task);

    await this.auditLogsService.log(actor.id, 'task_deleted', 'task', taskId, { title: task.title });
  }

  // --- List Tasks ---
  async getTasks(
    actor: User,
    projectId?: number,
    page = 1,
    limit = 50,
    status?: TaskStatus,
    priority?: TaskPriority,
    search?: string
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const query = this.taskRepo.createQueryBuilder('t');

    if (projectId) {
      const project = await this.projRepo.findOne({ where: { id: projectId } });
      if (!project) {
        throw new Error('Project not found');
      }

      if (actor.role === Role.CHEF_PROJET) {
        checkOwnership(actor, project.chefId);
      } else if (actor.role === Role.DEVELOPER) {
        const member = await this.memberRepo.findOne({ where: { developerId: actor.id } });
        if (!member || member.teamId !== project.teamId) {
          throw new Error('Forbidden: You are not assigned to this project.');
        }
      }
      query.where('t.projectId = :projectId', { projectId });
    } else {
      if (actor.role === Role.CHEF_PROJET) {
        query.innerJoin(Project, 'p', 'p.id = t.projectId')
          .where('p.chefId = :chefId', { chefId: actor.id });
      } else if (actor.role === Role.DEVELOPER) {
        query.where('t.assigneeId = :devId', { devId: actor.id });
      } else if (actor.role !== Role.ADMIN) {
        throw new Error('Forbidden: Access denied');
      }
    }

    if (status) {
      query.andWhere('t.status = :status', { status });
    }
    if (priority) {
      query.andWhere('t.priority = :priority', { priority });
    }
    if (search) {
      query.andWhere('(t.title LIKE :search OR t.description LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('t.id', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [rawTasks, total] = await query.getManyAndCount();

    const populated = await Promise.all(
      rawTasks.map(async (t) => {
        let assignee : { id: number; fullName: string; email: string } | null = null;
        if (t.assigneeId) {
          assignee = await this.userRepo.findOne({
            where: { id: t.assigneeId },
            select: { id: true, fullName: true, email: true }
          });
        }

        const proj = await this.projRepo.findOne({
          where: { id: t.projectId },
          select: { id: true, title: true }
        });

        return {
          ...t,
          assignee,
          projectName: proj?.title || 'Unknown Project'
        };
      })
    );

    return {
      data: populated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // --- Get Task by ID ---
  async getTaskById(taskId: number, actor: User) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return null;

    const project = await this.projRepo.findOne({ where: { id: task.projectId } });
    if (!project) return null;

    if (actor.role === Role.CHEF_PROJET) {
      checkOwnership(actor, project.chefId);
    } else if (actor.role === Role.DEVELOPER) {
      const member = await this.memberRepo.findOne({ where: { developerId: actor.id } });
      if (!member || (member.teamId !== project.teamId && task.assigneeId !== actor.id)) {
        throw new Error('Forbidden: Access denied');
      }
    }

    let assignee : { id: number; fullName: string; email: string } | null = null;
    if (task.assigneeId) {
      assignee = await this.userRepo.findOne({
        where: { id: task.assigneeId },
        select: { id: true, fullName: true, email: true }
      });
    }

    return {
      ...task,
      assignee,
      projectTitle: project.title,
      projectTeamId: project.teamId
    };
  }

  // --- Add Comment ---
  async addComment(taskId: number, content: string, actor: User): Promise<Comment> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const project = await this.projRepo.findOne({ where: { id: task.projectId } });
    if (!project) {
      throw new Error('Associated Project not found');
    }

    if (actor.role === Role.DEVELOPER) {
      if (task.assigneeId !== actor.id) {
        throw new Error('Forbidden: You can only comment on tasks assigned to you.');
      }
    } else if (actor.role === Role.CHEF_PROJET) {
      checkOwnership(actor, project.chefId);
    }

    const comment = new Comment();
    comment.taskId = taskId;
    comment.userId = actor.id;
    comment.content = content;
    comment.createdAt = new Date().toISOString();

    const saved = await this.commentRepo.save(comment);

    if (actor.role === Role.DEVELOPER) {
      const msg = `Developer ${actor.fullName} commented on task "${task.title}": "${content.slice(0, 30)}..."`;
      await this.notificationService.createNotification(project.chefId, 'task_assigned', msg);
    } else if (actor.role === Role.CHEF_PROJET && task.assigneeId) {
      const msg = `Chef de Projet ${actor.fullName} commented on your task "${task.title}": "${content.slice(0, 30)}..."`;
      await this.notificationService.createNotification(task.assigneeId, 'task_assigned', msg);
    }

    return saved;
  }

  // --- Get Comments ---
  async getComments(taskId: number, actor: User): Promise<any[]> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const project = await this.projRepo.findOne({ where: { id: task.projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    if (actor.role === Role.DEVELOPER) {
      if (task.assigneeId !== actor.id) {
        throw new Error('Forbidden: Access denied');
      }
    } else if (actor.role === Role.CHEF_PROJET) {
      checkOwnership(actor, project.chefId);
    }

    const rawComments = await this.commentRepo.find({
      where: { taskId },
      order: { id: 'ASC' }
    });

    const populated = await Promise.all(
      rawComments.map(async (c) => {
        const user = await this.userRepo.findOne({
          where: { id: c.userId },
          select: { id: true, fullName: true, email: true, role: true }
        });
        return {
          ...c,
          user
        };
      })
    );

    return populated;
  }

  // --- Due Date Cron Task ---
  async sendDueReminders(): Promise<number> {
    const now = new Date();
    const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const tasks = await this.taskRepo.createQueryBuilder('t')
      .where('t.status != :status', { status: TaskStatus.DONE })
      .andWhere('t.dueDate IS NOT NULL')
      .getMany();

    let reminderCount = 0;

    for (const task of tasks) {
      if (!task.dueDate || !task.assigneeId) continue;
      
      const taskDue = new Date(task.dueDate);
      const diffMs = taskDue.getTime() - now.getTime();
      const diffHours = diffMs / (60 * 60 * 1000);

      if (diffHours > 0 && diffHours <= 24) {
        const assignee = await this.userRepo.findOne({ where: { id: task.assigneeId } });
        const proj = await this.projRepo.findOne({ where: { id: task.projectId } });
        
        if (assignee && proj) {
          await this.mailService.sendDueReminder(assignee.email, task.title, proj.title, task.dueDate);
          await this.notificationService.createNotification(
            assignee.id,
            'reminder',
            `Reminder: Your task "${task.title}" is due in less than 24 hours (Due: ${new Date(task.dueDate).toLocaleDateString()})`
          );
          reminderCount++;
        }
      }
    }

    if (reminderCount > 0) {
      console.log(`⏰ Scheduled job completed: Sent ${reminderCount} due date reminders.`);
    }

    return reminderCount;
  }
}
export { TasksService as TaskService };
