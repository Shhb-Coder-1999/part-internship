/**
 * @typedef {Object} Comment
 * @property {string} id - Unique ID of the comment.
 * @property {string} userId - ID of the user who posted the comment.
 * @property {string} text - The comment text.
 * @property {number} likes - Number of likes.
 * @property {number} dislikes - Number of dislikes.
 * @property {string | null} parentId - ID of the parent comment if it's a reply, otherwise null.
 * @property {string[]} replies - Array of IDs of direct replies. (No longer full objects)
 * @property {string} createdAt - ISO 8601 timestamp of creation.
 * @property {string} updatedAt - ISO 8601 timestamp of last update.
 * @property {boolean} [isDeleted=false] - Flag to indicate if the comment is soft-deleted.
 */

/**
 * @typedef {Object} ValidationRule
 * @property {function(any): boolean} condition - A function that returns true if the validation fails.
 * @property {string} errorMessage - The error message to throw if the condition is true.
 * @property {number} statusCode - The HTTP status code associated with this error (e.g., 400, 404).
 */

/**
 * A generic validation service that applies a set of rules to an item.
 */
const ValidationService = (() => {
  return {
    /**
     * Validates an item against a list of rules.
     * @param {any} item - The item to validate.
     * @param {ValidationRule[]} rules - An array of validation rules.
     * @throws {Error} Throws an error with a specific message and status code if any rule fails.
     */
    validate: (item, rules) => {
      for (const rule of rules) {
        if (rule.condition(item)) {
          const error = new Error(rule.errorMessage);
          error.statusCode = rule.statusCode; // Attach status code to the error object
          throw error;
        }
      }
    }
  };
})();

/**
 * Simulates a data layer for comments.
 * All data manipulation logic is encapsulated here.
 */
const CommentData = (() => {
  // Initial comments data
  const initialComments = [
    {
      id: "comment_123",
      userId: "user_456",
      text: "مقاله فوق‌العاده‌ای بود! تحلیل‌های شما درباره آینده هوش مصنوعی بسیار روشنگر بود و دیدگاه‌های جدیدی به من داد. بی‌صبرانه منتظر مقالات بعدی شما هستم.",
      likes: 5,
      dislikes: 2,
      parentId: null,
      replies: ["comment_124", "comment_125"],
      createdAt: "2023-05-20T10:30:00Z",
      updatedAt: "2023-05-20T10:30:00Z",
      isDeleted: false,
    },
    {
      id: "comment_124",
      userId: "user_789",
      text: "کاملاً موافقم! خصوصاً بخشی که به چالش‌های اخلاقی AI اشاره کردید، بسیار عمیق و به‌موقع بود. فکر می‌کنم این بحث‌ها باید بیشتر مطرح شوند.",
      likes: 3,
      dislikes: 0,
      parentId: "comment_123",
      replies: [],
      createdAt: "2023-05-20T10:45:00Z",
      updatedAt: "2023-05-20T10:45:00Z",
      isDeleted: false,
    },
    {
      id: "comment_125",
      userId: "user_101",
      text: "تحلیل‌ها عالی بود، اما ای کاش در مورد تأثیرات بلندمدت اقتصادی هوش مصنوعی بر بازار کار هم بیشتر توضیح می‌دادید. این جنبه برای من خیلی مهم است.",
      likes: 1,
      dislikes: 1,
      parentId: "comment_123",
      replies: [],
      createdAt: "2023-05-20T11:00:00Z",
      updatedAt: "2023-05-20T11:00:00Z",
      isDeleted: false,
    },
    {
      id: "comment_200",
      userId: "user_111",
      text: "از زمانی که این مقاله را خواندم، دیدگاهم نسبت به فناوری بلاک‌چین کاملاً عوض شد. آیا برنامه‌ای برای مقالات عمیق‌تر در این زمینه دارید؟ مشتاقانه منتظرم!",
      likes: 10,
      dislikes: 0,
      parentId: null,
      replies: [],
      createdAt: "2023-06-20T09:00:00Z",
      updatedAt: "2023-06-20T09:00:00Z",
      isDeleted: false,
    },
    {
      id: "comment_201",
      userId: "user_222",
      text: "متن بسیار روان و جذابی داشت. اطلاعات ارائه شده کاملاً کاربردی و قابل فهم بود, حتی برای کسانی که در این زمینه تخصص ندارند. دست مریزاد!",
      likes: 7,
      dislikes: 1,
      parentId: null,
      replies: [],
      createdAt: "2023-06-21T14:15:00Z",
      updatedAt: "2023-06-21T14:15:00Z",
      isDeleted: false,
    },
  ];

  /** @type {Comment[]} */
  let comments = initialComments; // Comments are now always initialized with initialComments

  const currentUserId = "user_456"; // Simulates the currently logged-in user

  /**
   * Generates a unique ID for a comment.
   * @returns {string} A unique ID.
   */
  const generateId = () => `comment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  /**
   * Gets the current timestamp in ISO 8601 format.
   * @returns {string} Current timestamp.
   */
  const getTimestamp = () => new Date().toISOString();

  return {
    /**
     * Retrieves comments.
     * Returns a flat list of comments. Client is responsible for nesting.
     * @param {string | null} parentId - If provided, returns replies for that parent. Otherwise, returns all top-level and replies.
     * @param {boolean} includeDeleted - If true, includes soft-deleted comments.
     * @returns {Comment[]}
     */
    getAll: (parentId = null, includeDeleted = false) => {
      let filteredComments = comments;
      if (!includeDeleted) {
        filteredComments = comments.filter(comment => !comment.isDeleted);
      }

      if (parentId) {
        // If parentId is provided, return only direct replies to that parent
        return filteredComments.filter(comment => comment.parentId === parentId);
      }

      // Otherwise, return all comments (top-level and replies) in a flat list
      return filteredComments;
    },

    /**
     * Finds a comment by its ID.
     * @param {string} id - The ID of the comment.
     * @returns {Comment | undefined} The comment object if found, otherwise undefined.
     */
    getById: (id) => {
      return comments.find(comment => comment.id === id);
    },

    /**
     * Adds a new comment.
     * @param {string} text - The comment text.
     * @param {string | null} parentId - Optional parent ID if it's a reply.
     * @returns {Comment} The newly created comment.
     * @throws {Error} If text is invalid or parentId is not found.
     */
    add: (text, parentId = null) => {
      // Basic text validation using the generic ValidationService
      ValidationService.validate(text, [
        { condition: (t) => !t || t.length === 0, errorMessage: 'Comment text cannot be empty.', statusCode: 400 },
        { condition: (t) => t.length > 250, errorMessage: 'Comment text exceeds 250 characters.', statusCode: 400 },
      ]);

      const newComment = {
        id: generateId(),
        userId: currentUserId,
        text,
        likes: 0,
        dislikes: 0,
        parentId: parentId,
        replies: [], // New comments have no replies initially (as IDs)
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
        isDeleted: false, // New comments are not deleted
      };

      comments.push(newComment); // Add comment first, then validate parent and remove if invalid

      if (parentId) {
        const parentComment = comments.find(c => c.id === parentId);

        // Validation rules for the parent comment
        ValidationService.validate(parentComment, [
          {
            condition: (p) => !p,
            errorMessage: `Parent comment with ID '${parentId}' not found.`,
            statusCode: 404
          },
          {
            condition: (p) => p.isDeleted,
            errorMessage: `Cannot reply to a deleted comment.`,
            statusCode: 400
          }
        ]);

        // If validation passes, link the reply to the parent
        if (!Array.isArray(parentComment.replies)) {
            parentComment.replies = [];
        }
        parentComment.replies.push(newComment.id);
      }
      return newComment;
    },

    /**
     * Updates an existing comment's text.
     * @param {string} id - The ID of the comment to update.
     * @param {string} newText - The new text for the comment.
     * @returns {Comment} The updated comment.
     * @throws {Error} If comment not found or text is invalid.
     */
    update: (id, newText) => {
      const commentIndex = comments.findIndex(comment => comment.id === id); // Find without deleted check first

      // Validate comment existence and status
      ValidationService.validate(comments[commentIndex], [
        { condition: (c) => !c, errorMessage: `Comment with ID '${id}' not found.`, statusCode: 404 },
        { condition: (c) => c.isDeleted, errorMessage: `Comment with ID '${id}' is deleted.`, statusCode: 400 },
      ]);

      // Validate new text
      ValidationService.validate(newText, [
        { condition: (t) => !t || t.length === 0, errorMessage: 'Updated text cannot be empty.', statusCode: 400 },
        { condition: (t) => t.length > 250, errorMessage: 'Updated text exceeds 250 characters.', statusCode: 400 },
      ]);

      comments[commentIndex].text = newText;
      comments[commentIndex].updatedAt = getTimestamp();
      return comments[commentIndex];
    },

    /**
     * Soft-deletes a comment by its ID.
     * @param {string} id - The ID of the comment to delete.
     * @returns {boolean} True if deleted.
     * @throws {Error} If comment not found or already deleted.
     */
    deleteComment: (id) => {
      const comment = comments.find(c => c.id === id);

      // Validate comment existence and status
      ValidationService.validate(comment, [
        { condition: (c) => !c, errorMessage: `Comment with ID '${id}' not found.`, statusCode: 404 },
        { condition: (c) => c.isDeleted, errorMessage: `Comment with ID '${id}' is already deleted.`, statusCode: 400 },
      ]);

      comment.isDeleted = true;
      comment.updatedAt = getTimestamp(); // Update timestamp for deletion
      return true; // Successfully soft-deleted
    },

    /**
     * Increments the like count for a comment.
     * @param {string} id - The ID of the comment.
     * @returns {{likes: number, dislikes: number}} The updated like/dislike counts.
     * @throws {Error} If comment not found or is deleted.
     */
    addLike: (id) => {
      const comment = comments.find(c => c.id === id);

      // Validate comment existence and status
      ValidationService.validate(comment, [
        { condition: (c) => !c, errorMessage: `Comment with ID '${id}' not found.`, statusCode: 404 },
        { condition: (c) => c.isDeleted, errorMessage: `Cannot like a deleted comment with ID '${id}'.`, statusCode: 400 },
      ]);

      comment.likes = (comment.likes || 0) + 1;
      return { likes: comment.likes, dislikes: comment.dislikes };
    },

    /**
     * Increments the dislike count for a comment.
     * @param {string} id - The ID of the comment.
     * @returns {{likes: number, dislikes: number}} The updated like/dislike counts.
     * @throws {Error} If comment not found or is deleted.
     */
    addDislike: (id) => {
      const comment = comments.find(c => c.id === id);

      // Validate comment existence and status
      ValidationService.validate(comment, [
        { condition: (c) => !c, errorMessage: `Comment with ID '${id}' not found.`, statusCode: 404 },
        { condition: (c) => c.isDeleted, errorMessage: `Cannot dislike a deleted comment with ID '${id}'.`, statusCode: 400 },
      ]);

      comment.dislikes = (comment.dislikes || 0) + 1;
      return { likes: comment.likes, dislikes: comment.dislikes };
    },

    /**
     * Returns the current user ID for actions like edit/delete.
     * @returns {string} The simulated current user ID.
     */
    getCurrentUserId: () => currentUserId,
  };
})();

export { CommentData, ValidationService }; 