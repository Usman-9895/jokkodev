import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationRecorder } from './notifications';
@Global()
@Module({ providers: [MailService,NotificationRecorder], exports: [MailService,NotificationRecorder] })
export class MailModule {}
