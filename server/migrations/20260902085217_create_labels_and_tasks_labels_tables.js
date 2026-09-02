/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = (knex) => (
  knex.schema
    .createTable('labels', (table) => {
      table.increments('id').primary();
      table.string('name').unique().notNullable();
      table.timestamps(true, true);
    })
    .createTable('tasks_labels', (table) => {
      table.increments('id').primary();
      // Связи с внешними ключами RESTRICT
      table.integer('task_id').unsigned().references('id').inTable('tasks').onDelete('CASCADE');
      table.integer('label_id').unsigned().references('id').inTable('labels').onDelete('RESTRICT');
    })
);

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = (knex) => (
  knex.schema.dropTable('tasks_labels').dropTable('labels')
);
