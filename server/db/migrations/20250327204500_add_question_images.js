exports.up = function(knex) {
  return knex.schema
    .alterTable('questions', function(table) {
      table.string('image_url').nullable().comment('URL for image associated with the question');
      table.boolean('has_image_options').defaultTo(false).comment('Whether the options include images');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('questions', function(table) {
      table.dropColumn('image_url');
      table.dropColumn('has_image_options');
    });
};
