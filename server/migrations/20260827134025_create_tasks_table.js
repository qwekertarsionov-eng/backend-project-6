/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = (knex) => (
  knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    
    // Внешние ключи по ТЗ Хекслета
    table.integer('status_id').unsigned().references('id').inTable('task_statuses').onDelete('RESTRICT');
    table.integer('creator_id').unsigned().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('executor_id').unsigned().references('id').inTable('users').onDelete('RESTRICT');
    
    table.timestamps(true, true);
  })
);

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = (knex) => knex.schema.dropTable('tasks');
