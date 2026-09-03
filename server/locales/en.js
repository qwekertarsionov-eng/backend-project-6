export default {
  en: {
    appName: 'Task Manager',
    flash: {
      users: {
        create: {
          success: 'User successfully registered',
          error: 'Failed to register user',
        },
      },
      statuses: {
        create: { success: 'Status successfully created', error: 'Failed to create status' },
        update: { success: 'Status successfully updated', error: 'Failed to update status' },
        delete: { success: 'Status successfully deleted', error: 'Cannot delete status' },
      },
      tasks: {
        create: { success: 'Task successfully created', error: 'Failed to create task' },
        update: { success: 'Task successfully updated', error: 'Failed to update task' },
        delete: { success: 'Task successfully deleted', error: 'Only creator can delete this task' },
      },
      labels: {
        create: { success: 'Label successfully created', error: 'Failed to create label' },
        update: { success: 'Label successfully updated', error: 'Failed to update label' },
        delete: { success: 'Label successfully deleted', error: 'Cannot delete label' },
      },
    },
    views: {
      layouts: {
        application: {
          users: 'Users',
          tasks: 'Tasks',
          statuses: 'Statuses',
          labels: 'Labels',
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
      tasks: {
        id: 'ID',
        name: 'Name',
        description: 'Description',
        status: 'Status',
        creator: 'Creator',
        executor: 'Executor',
        createdAt: 'Created At',
        actions: 'Actions',
        index: { title: 'Tasks', create: 'Create task' },
        new: { title: 'Create task', submit: 'Create' },
        edit: { title: 'Edit task', submit: 'Save' },
        show: { title: 'Task Details' },
        filter: {
          status: 'Status',
          executor: 'Executor',
          label: 'Label',
          isCreator: 'Only my tasks',
          submit: 'Show',
        },
      },
      labels: {
        id: 'ID',
        name: 'Name',
        createdAt: 'Created At',
        actions: 'Actions',
        index: {
          title: 'Labels',
          create: 'Create label',
        },
        new: {
          title: 'Create label',
          submit: 'Create',
        },
        edit: {
          title: 'Edit label',
          submit: 'Save',
        },
        delete: {
          submit: 'Delete',
        },
      },
    },
  },
};
