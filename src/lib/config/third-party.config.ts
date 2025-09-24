export const THIRD_PARTY_CONFIG = {
  // Payment Services
  PAYMENT: {
    STRIPE: {
      SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
      WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      API_VERSION: '2024-12-18.acacia' as const
    },
    PAYPAL: {
      CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
      CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
      MODE: (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live'
    }
  },

  // Email Services
  EMAIL: {
    SERVICE: process.env.EMAIL_SERVICE || 'sendgrid',
    SENDGRID: {
      API_KEY: process.env.SENDGRID_API_KEY || '',
      FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      FROM_NAME: process.env.SENDGRID_FROM_NAME || 'HK Heritage Crafts Platform'
    },
    AWS_SES: {
      REGION: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
      FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL || 'noreply@example.com'
    },
    SMTP: {
      HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
      PORT: parseInt(process.env.SMTP_PORT || '587'),
      SECURE: process.env.SMTP_SECURE === 'true',
      USER: process.env.SMTP_USER || '',
      PASS: process.env.SMTP_PASS || ''
    }
  },

  // Push Notification Services
  PUSH: {
    SERVICE: process.env.PUSH_SERVICE || 'firebase',
    FIREBASE: {
      PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || ''
    },
    WEB_PUSH: {
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
      VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
    }
  },

  // Cloud Storage Services
  STORAGE: {
    TYPE: process.env.STORAGE_TYPE || 'local',
    AWS_S3: {
      REGION: process.env.AWS_REGION || 'us-east-1',
      BUCKET_NAME: process.env.S3_BUCKET_NAME || 'heritage-crafts-bucket',
      ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    LOCAL: {
      UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads'
    }
  },

  // Translation Services
  TRANSLATION: {
    GOOGLE: {
      API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || ''
    },
    DEEPL: {
      API_KEY: process.env.DEEPL_API_KEY || '',
      IS_PRO: process.env.DEEPL_IS_PRO === 'true'
    }
  }
} as const

// Validation functions
export const validateThirdPartyConfig = () => {
  const errors: string[] = []

  // Validate payment configuration
  if (THIRD_PARTY_CONFIG.PAYMENT.STRIPE.SECRET_KEY && !THIRD_PARTY_CONFIG.PAYMENT.STRIPE.SECRET_KEY.startsWith('sk_')) {
    errors.push('Invalid Stripe secret key format')
  }

  if (THIRD_PARTY_CONFIG.PAYMENT.PAYPAL.CLIENT_ID && !['sandbox', 'live'].includes(THIRD_PARTY_CONFIG.PAYMENT.PAYPAL.MODE)) {
    errors.push('Invalid PayPal mode, must be "sandbox" or "live"')
  }

  // Validate email configuration
  if (THIRD_PARTY_CONFIG.EMAIL.SERVICE === 'sendgrid' && !THIRD_PARTY_CONFIG.EMAIL.SENDGRID.API_KEY) {
    errors.push('SendGrid API key is required when using SendGrid email service')
  }

  if (THIRD_PARTY_CONFIG.EMAIL.SERVICE === 'ses' && !THIRD_PARTY_CONFIG.STORAGE.AWS_S3.ACCESS_KEY_ID) {
    errors.push('AWS credentials are required when using SES email service')
  }

  // Validate push notification configuration
  if (THIRD_PARTY_CONFIG.PUSH.SERVICE === 'firebase' && !THIRD_PARTY_CONFIG.PUSH.FIREBASE.PROJECT_ID) {
    errors.push('Firebase project ID is required when using Firebase push notifications')
  }

  if (THIRD_PARTY_CONFIG.PUSH.SERVICE === 'web-push' && !THIRD_PARTY_CONFIG.PUSH.WEB_PUSH.VAPID_PUBLIC_KEY) {
    errors.push('VAPID keys are required when using Web Push notifications')
  }

  // Validate storage configuration
  if (THIRD_PARTY_CONFIG.STORAGE.TYPE === 's3' && !THIRD_PARTY_CONFIG.STORAGE.AWS_S3.BUCKET_NAME) {
    errors.push('S3 bucket name is required when using S3 storage')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper functions to check service availability
export const isServiceAvailable = {
  stripe: () => !!THIRD_PARTY_CONFIG.PAYMENT.STRIPE.SECRET_KEY,
  paypal: () => !!THIRD_PARTY_CONFIG.PAYMENT.PAYPAL.CLIENT_ID,
  sendgrid: () => !!THIRD_PARTY_CONFIG.EMAIL.SENDGRID.API_KEY,
  ses: () => !!THIRD_PARTY_CONFIG.STORAGE.AWS_S3.ACCESS_KEY_ID,
  firebase: () => !!THIRD_PARTY_CONFIG.PUSH.FIREBASE.PROJECT_ID,
  webPush: () => !!THIRD_PARTY_CONFIG.PUSH.WEB_PUSH.VAPID_PUBLIC_KEY,
  s3: () => !!THIRD_PARTY_CONFIG.STORAGE.AWS_S3.BUCKET_NAME && !!THIRD_PARTY_CONFIG.STORAGE.AWS_S3.ACCESS_KEY_ID,
  googleTranslate: () => !!THIRD_PARTY_CONFIG.TRANSLATION.GOOGLE.API_KEY,
  deepl: () => !!THIRD_PARTY_CONFIG.TRANSLATION.DEEPL.API_KEY
}

// Get service status
export const getServiceStatus = () => {
  return {
    payment: {
      stripe: isServiceAvailable.stripe(),
      paypal: isServiceAvailable.paypal()
    },
    email: {
      sendgrid: isServiceAvailable.sendgrid(),
      ses: isServiceAvailable.ses(),
      smtp: !!THIRD_PARTY_CONFIG.EMAIL.SMTP.HOST
    },
    push: {
      firebase: isServiceAvailable.firebase(),
      webPush: isServiceAvailable.webPush()
    },
    storage: {
      s3: isServiceAvailable.s3(),
      local: true // Always available
    },
    translation: {
      google: isServiceAvailable.googleTranslate(),
      deepl: isServiceAvailable.deepl()
    }
  }
}

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development'
  
  return {
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test',
    
    // Use sandbox/test endpoints in development
    paypalMode: env === 'production' ? 'live' : 'sandbox',
    stripeTestMode: env !== 'production',
    
    // Enable debug logging in development
    enableDebugLogging: env === 'development',
    
    // Use local storage in development by default
    defaultStorageType: env === 'production' ? 's3' : 'local'
  }
}