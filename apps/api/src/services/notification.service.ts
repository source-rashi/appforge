import nodemailer from 'nodemailer';
import { EventBusService, eventBus } from './event-bus.service';
import { prisma } from '../db/prisma';
import { configsMap } from '../routes/app.routes';
import type { Notification } from '@prisma/client';

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private isMockMode: boolean = true;

  constructor(private eventBusRef: EventBusService) {
    this.setupTransporter();
    this.registerEventListeners();
  }

  private setupTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      this.isMockMode = false;
    } else {
      console.warn('[NotificationService] SMTP credentials not fully provided. Running in mock mode.');
    }
  }

  private registerEventListeners(): void {
    const events = ['row:created', 'row:updated', 'row:deleted', 'import:completed', 'import:failed'] as const;

    for (const trigger of events) {
      this.eventBusRef.on(trigger, (data) => {
        this.processNotifications(trigger, data).catch((err) => {
          console.error(`[NotificationService] Error processing trigger ${trigger}:`, err);
        });
      });
    }
  }

  async processNotifications(
    trigger: string,
    data: { tableName?: string; row?: Record<string, unknown>; userId?: string; jobId?: string }
  ): Promise<void> {
    const { tableName, row = {}, userId } = data;

    // Look up active configs that have NotificationConfig matching this trigger + tableName
    for (const config of configsMap.values()) {
      if (!config.notifications) continue;

      const matchingEvents = config.notifications.events.filter(
        (e) => e.trigger === trigger && e.table === tableName
      );

      for (const event of matchingEvents) {
        // Resolve recipients
        let recipients: string[] = [];

        if (event.recipients === 'creator' && userId) {
          recipients.push(userId);
        } else if (event.recipients === 'all') {
          // Fetch all user IDs
          const allUsers = await prisma.user.findMany({ select: { id: true } });
          recipients = allUsers.map((u) => u.id);
        } else if (event.recipients === 'creator' && !userId) {
          // No user to send to (e.g., anonymous operation)
          continue;
        }

        // Render templates
        const renderTemplate = (tpl: string) => {
          return tpl.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const val = row[key.trim()];
            return val !== undefined && val !== null ? String(val) : '';
          });
        };

        const subject = renderTemplate(event.template.subject);
        const body = renderTemplate(event.template.body);

        // Process per recipient
        for (const recipientId of recipients) {
          for (const channel of event.channels) {
            if (channel === 'email') {
              const user = await prisma.user.findUnique({ where: { id: recipientId } });
              if (user && user.email) {
                await this.sendEmailNotification(recipientId, [user.email], subject, body);
              }
            } else if (channel === 'in_app') {
              await this.sendInAppNotification(recipientId, subject, body);
            }
          }
        }
      }
    }
  }

  private async sendEmailNotification(
    userId: string,
    to: string[],
    subject: string,
    body: string
  ): Promise<void> {
    if (this.isMockMode || !this.transporter) {
      console.log(`[EMAIL MOCK] To: ${to.join(', ')} | Subject: ${subject} | Body: ${body}`);
      await prisma.notification.create({
        data: {
          userId,
          type: 'email',
          channel: 'email',
          subject,
          body,
          sentAt: new Date(),
        },
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@appforge.local',
        to: to.join(', '),
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      });

      await prisma.notification.create({
        data: {
          userId,
          type: 'email',
          channel: 'email',
          subject,
          body,
          sentAt: new Date(),
        },
      });
    } catch (err: any) {
      console.error(`[NotificationService] Failed to send email to ${to}:`, err.message);
    }
  }

  private async sendInAppNotification(userId: string, subject: string, body: string): Promise<void> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'in_app',
        channel: 'in_app',
        subject,
        body,
        read: false,
      },
    });

    eventBus.emit('notification:new', { userId, notification });
  }

  async getNotifications(
    userId: string,
    options: { unreadOnly?: boolean; page?: number; pageSize?: number }
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const { unreadOnly, page = 1, pageSize = 20 } = options;

    const whereClause: any = { userId, channel: 'in_app' };
    if (unreadOnly) {
      whereClause.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({
        where: { userId, channel: 'in_app', read: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export const notificationService = new NotificationService(eventBus);
