/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
