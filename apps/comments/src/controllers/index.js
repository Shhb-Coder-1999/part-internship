/**
 * Controllers Index
 * Exports all controller classes from this directory
 */

import { CommentController } from './commentController.js';

// Create controller instance for tests
const commentControllerInstance = new CommentController();

// Export wrapper object that provides the expected API for tests
export const commentController = {
  createComment: (...args) => commentControllerInstance.createComment(...args),
  getComments: (...args) => commentControllerInstance.getComments(...args),
  getAllComments: (...args) => commentControllerInstance.getAllComments(...args),
  getCommentById: (...args) => commentControllerInstance.getCommentById(...args),
  updateComment: (...args) => commentControllerInstance.updateComment(...args),
  deleteComment: (...args) => commentControllerInstance.deleteComment(...args),
  getReplies: (...args) => commentControllerInstance.getReplies(...args),
  likeComment: (...args) => commentControllerInstance.likeComment(...args),
  dislikeComment: (...args) => commentControllerInstance.dislikeComment(...args),
  searchComments: (...args) => commentControllerInstance.searchComments(...args),
  getCommentStats: (...args) => commentControllerInstance.getCommentStats(...args)
};

// Export the class as well
export { CommentController } from './commentController.js';
