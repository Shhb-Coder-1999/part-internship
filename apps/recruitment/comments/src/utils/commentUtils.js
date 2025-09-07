/**
 * Simple Comment Utilities
 * Essential functions for comment processing
 */

export const commentUtils = {
  /**
   * Sanitize comment text
   */
  sanitizeText(text) {
    if (!text) return '';
    return String(text)
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();                 // Remove leading/trailing whitespace
  },

  /**
   * Format comment for API response
   */
  formatComment(comment) {
    if (!comment) return null;
    
    const { isDeleted, internalId, ...rest } = comment;
    return {
      ...rest,
      createdAt: rest.createdAt ? new Date(rest.createdAt) : rest.createdAt,
      updatedAt: rest.updatedAt ? new Date(rest.updatedAt) : rest.updatedAt
    };
  },

  /**
   * Validate and normalize pagination parameters
   */
  validatePagination(params) {
    const { page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    return {
      page: pageNum,
      limit: limitNum
    };
  },

  /**
   * Calculate pagination metadata
   */
  calculatePagination(total, page = 1, limit = 10) {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    
    return {
      page: currentPage,
      totalPages,
      total,
      limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      offset: (currentPage - 1) * limit,
    };
  },

  /**
   * Search comments by text content
   */
  searchComments(comments, searchTerm) {
    if (!searchTerm) return comments;
    const term = String(searchTerm).toLowerCase();
    return comments.filter(c => 
      String(c.text).toLowerCase().includes(term)
    );
  },

  /**
   * Sort comments by field and order
   */
  sortComments(comments, field = 'createdAt', order = 'desc') {
    return [...comments].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (order === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }
};