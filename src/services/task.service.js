const Task = require('../models/Task');
const logger = require('../utils/logger');

/**
 * Perform bulk updates on tasks to support drag-and-drop Kanban reordering.
 * @param {Array<Object>} taskReorderList - Array of { taskId, order, status }
 * @returns {Promise<boolean>} Success state
 */
const reorderTasks = async (taskReorderList) => {
  try {
    if (!taskReorderList || !Array.isArray(taskReorderList) || taskReorderList.length === 0) {
      return false;
    }

    const bulkOps = taskReorderList.map((item) => ({
      updateOne: {
        filter: { _id: item.taskId },
        update: {
          $set: {
            order: item.order,
            status: item.status
          }
        }
      }
    }));

    const result = await Task.bulkWrite(bulkOps);
    logger.info(`Kanban bulk reorder complete. Modified documents: ${result.modifiedCount}`);
    return true;
  } catch (error) {
    logger.error(`Error reordering tasks: ${error.message}`);
    throw error;
  }
};

module.exports = {
  reorderTasks
};
