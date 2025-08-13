/**
 * Services Index
 * Exports all service classes from this directory
 */

import { DatabaseService } from './databaseService.js';
import { CommentService } from './commentService.js';

// Create service instances for tests
const databaseServiceInstance = new DatabaseService();
const commentServiceInstance = new CommentService();

// Export wrapper objects that provide the expected API for tests
export const databaseService = {
  createComment: (...args) => databaseServiceInstance.createComment(...args),
  getComments: (...args) => databaseServiceInstance.getComments(...args),
  getCommentById: (...args) => databaseServiceInstance.getCommentById(...args),
  updateComment: (...args) => databaseServiceInstance.updateComment(...args),
  deleteComment: (...args) => databaseServiceInstance.deleteComment(...args),
  getAllRecords: (...args) => databaseServiceInstance.getAllRecords(...args),
  getRecordById: (...args) => databaseServiceInstance.getRecordById(...args),
  createRecord: (...args) => databaseServiceInstance.createRecord(...args),
  updateRecord: (...args) => databaseServiceInstance.updateRecord(...args),
  deleteRecord: (...args) => databaseServiceInstance.deleteRecord(...args)
};

export const commentService = {
  createComment: (...args) => commentServiceInstance.createComment(...args),
  getComments: (...args) => commentServiceInstance.getComments(...args),
  getCommentById: (...args) => commentServiceInstance.getCommentById(...args),
  updateComment: (...args) => commentServiceInstance.updateComment(...args),
  deleteComment: (...args) => commentServiceInstance.deleteComment(...args),
  getAllComments: (...args) => commentServiceInstance.getAllComments(...args),
  getReplies: (...args) => commentServiceInstance.getReplies(...args),
  likeComment: (...args) => commentServiceInstance.likeComment(...args),
  dislikeComment: (...args) => commentServiceInstance.dislikeComment(...args),
  searchComments: (...args) => commentServiceInstance.searchComments(...args)
};

// Export the classes as well
export { DatabaseService } from './databaseService.js';
export { CommentService } from './commentService.js';
