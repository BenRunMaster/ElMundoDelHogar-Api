import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 1025),
        secure: env.bool('SMTP_SECURE', false),
        ignoreTLS: env.bool('SMTP_IGNORE_TLS', true),
        ...(env('SMTP_USERNAME') && env('SMTP_PASSWORD')
          ? { auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') } }
          : {}),
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM', 'no-reply@localhost'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLY_TO', 'no-reply@localhost'),
      },
    },
  },
  documentation: {
    // Keep interactive API docs available locally and disabled in production
    // unless an operator explicitly enables and protects them.
    enabled: env.bool('API_DOCS_ENABLED', env('NODE_ENV') !== 'production'),
  },
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
        cookie: {
          secure: env.bool('PANEL_AUTH_COOKIE_SECURE', env('NODE_ENV') === 'production'),
          sameSite: 'lax',
        },
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
});

export default config;
