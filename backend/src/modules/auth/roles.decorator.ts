/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
