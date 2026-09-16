export default {
  en: {
    lang: "en",
    appName: "Task Manager",
    flash: {
      authError: "Access denied! Please log in.",
      userAccessError: "You cannot edit or delete another user",
      session: {
        signedIn: "You are logged in",
        signedOut: "You are logged out",
        signInError: "Invalid email or password",
      },
      users: {
        create: {
          success: "User successfully registered",
          error: "Failed to register user",
        },
        update: {
          success: "User successfully updated",
          error: "Failed to update user",
        },
        delete: {
          success: "User successfully deleted",
          error: "Failed to delete user",
        },
      },
      statuses: {
        create: { success: "Status successfully created", error: "Failed to create status" },
        update: { success: "Status successfully updated", error: "Failed to update status" },
        delete: { success: "Status successfully deleted", error: "Cannot delete status" },
      },
      tasks: {
        create: { success: "Task successfully created", error: "Failed to create task" },
        update: { success: "Task successfully updated", error: "Failed to update task" },
        delete: {
          success: "Task successfully deleted",
          error: "Only creator can delete this task",
        },
      },
      labels: {
        create: { success: "Label successfully created", error: "Failed to create label" },
        update: { success: "Label successfully updated", error: "Failed to update label" },
        delete: { success: "Label successfully deleted", error: "Cannot delete label" },
      },
    },
    views: {
      session: {
        new: { submit: "Sign In" },
      },
      layouts: {
        application: {
          users: "Users",
          tasks: "Tasks",
          statuses: "Statuses",
          labels: "Labels",
          login: "Sign In",
          register: "Sign Up",
          logout: "Sign Out",
        },
      },
      index: {
        hello: "Hello from Hexlet!",
        description: "This is a simple task manager built with Fastify and Eta.",
        more: "Learn more",
      },
      users: {
        id: "ID",
        fullName: "Full Name",
        email: "Email",
        firstName: "First Name",
        lastName: "Last Name",
        password: "Password",
        createdAt: "Created At",
        actions: "Actions",
        index: {
          empty: "No users registered yet.",
        },
        new: {
          submit: "Register",
        },
        edit: {
          title: "Edit user",
          submit: "Save",
        },
        delete: {
          submit: "Delete",
        },
      },
      statuses: {
        id: "ID",
        name: "Name",
        createdAt: "Created At",
        actions: "Actions",
        index: {
          title: "Statuses",
          create: "Create status",
          empty: "No statuses available.",
        },
        new: {
          title: "Create status",
          submit: "Create",
        },
        edit: {
          title: "Edit status",
          submit: "Save",
        },
        delete: {
          submit: "Delete",
        },
      },
      tasks: {
        id: "ID",
        name: "Name",
        description: "Description",
        status: "Status",
        creator: "Creator",
        executor: "Executor",
        createdAt: "Created At",
        actions: "Actions",
        index: {
          title: "Tasks",
          create: "Create task",
          empty: "No tasks found.",
        },
        new: { title: "Create task", submit: "Create" },
        edit: { title: "Edit task", submit: "Save" },
        show: { title: "Task Details" },
        labels: "Labels",
        selectStatus: "Select status",
        noDescription: "No description provided.",
        delete: {
          submit: "Delete",
        },
        filter: {
          status: "Status",
          executor: "Executor",
          label: "Label",
          isCreator: "Only my tasks",
          submit: "Show",
        },
      },
      labels: {
        id: "ID",
        name: "Name",
        createdAt: "Created At",
        actions: "Actions",
        index: {
          title: "Labels",
          create: "Create label",
          empty: "No labels available.",
        },
        new: {
          title: "Create label",
          submit: "Create",
        },
        edit: {
          title: "Edit label",
          submit: "Save",
        },
        delete: {
          submit: "Delete",
        },
      },
    },
  },
};
