export default {
  en: {
    flash: {
        statuses: {
          create: {
          success: 'Status successfully created',
          error: 'Failed to create status',
        },
        update: {
         success: 'Status successfully updated',
         error: 'Failed to update status',
        },
        delete: {
         success: 'Status successfully deleted',
         error: 'Cannot delete status', // Потребуется, если статус привязан к задаче
        },
      },
    },
    appName: 'Task Manager',
    views: {
      statuses: {
        id: 'ID',
        name: 'Name',
        createdAt: 'Created At',
        actions: 'Actions',
        index: {
          title: 'Statuses',
          create: 'Create status',
        },
        new: {
          title: 'Create status',
          submit: 'Create',
        },
        edit: {
          title: 'Edit status',
          submit: 'Save',
        },
        delete: {
          submit: 'Delete',
        },
      },
      layouts: {
        application: {
          statuses: 'Statuses',
          users: 'Users',
          login: 'Sign In',
          register: 'Sign Up',
          logout: 'Sign Out',
        },
      },
      index: {
        hello: 'Hello from Hexlet!',
        description: 'This is a simple task manager built with Fastify and Pug.',
      },
      users: {
        id: 'ID',
        email: 'Email',
        firstName: 'First Name',
        lastName: 'Last Name',
        password: 'Password',
        createdAt: 'Created At',
        actions: 'Actions',
        new: {
          submit: 'Register',
        },
        edit: {
          submit: 'Save',
        },
      },
    },
  },
};
