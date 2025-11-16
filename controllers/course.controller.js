const { validationResult } = require("express-validator");
const Course = require("../models/Course.model");
const User = require("../models/User.model");
const SearchHistory = require("../models/SearchHistory.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const {
  generateAISearchRecommendations,
  getAPIUsageStats,
} = require("../services/chatgpt.service");
const {
  checkUserRequestLimit,
  getUserUsageSummary,
} = require("../utils/perUserRateLimit");

// create new course
const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const {
      courseName,
      courseCategory,
      description,
      whatYouWillLearn,
      skills,
      tools,
      startingDate,
      duration,
      price,
      courseFlyerURL,
    } = req.body;

    // Validate Instructor
    const instructor = await User.findById(req.user._id);
    if (!instructor) {
      return sendErrorResponse(res, 404, "Instructor not found");
    }

    const instructorName = `${instructor.firstName} ${instructor.lastName}`;

    const course = await Course.create({
      courseName,
      courseCategory,
      instructorId: req.user._id,
      instructorName,
      description,
      whatYouWillLearn: whatYouWillLearn || [],
      skills,
      tools: tools || [],
      startingDate,
      duration,
      price,
      courseFlyerURL,
    });

    return sendSuccessResponse(res, 201, "Course created successfully", {
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    return sendErrorResponse(res, 500, "Server error while creating course");
  }
};

// get all courses
const getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      search,
      category,
      skills,
      tools,
      duration,
      instructorName,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Save search history for authenticated users
    if (req.user && search) {
      try {
        // Check current search history count for this user
        const searchCount = await SearchHistory.countDocuments({
          userId: req.user._id,
        });

        console.log(`[SearchHistory - getAllCourses] User ${req.user._id} has ${searchCount} searches`);

        // If user has 3 or more searches, delete the oldest ones
        const MAX_SEARCH_HISTORY = 3; 
        if (searchCount >= MAX_SEARCH_HISTORY) {
          const excessCount = searchCount - (MAX_SEARCH_HISTORY - 1); // Keep only (MAX-1)
          console.log(`[SearchHistory - getAllCourses] Need to delete ${excessCount} old searches`);

          const oldestSearches = await SearchHistory.find({
            userId: req.user._id,
          })
            .sort({ createdAt: 1 })
            .limit(excessCount)
            .select("_id");

          const idsToDelete = oldestSearches.map((search) => search._id);
          console.log(`[SearchHistory - getAllCourses] Deleting IDs:`, idsToDelete);

          const deleteResult = await SearchHistory.deleteMany({ _id: { $in: idsToDelete } });
          console.log(`[SearchHistory - getAllCourses] Deleted ${deleteResult.deletedCount} searches`);
        }

        // Create new search history entry
        await SearchHistory.create({
          userId: req.user._id,
          searchQuery: search,
          searchType: "course_search",
          filters: {
            category: category || undefined,
            skills: skills ? skills.split(",").map((s) => s.trim()) : undefined,
            tools: tools ? tools.split(",").map((t) => t.trim()) : undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
          },
        });
        console.log(`[SearchHistory - getAllCourses] Created new search entry for query: "${search}"`);
      } catch (searchError) {
        console.error("Error saving search history:", searchError);
      }
    }

    // Build Search query
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // filter by category
    if (category) {
      query.courseCategory = category;
    }

    // filter by skills
    if (skills) {
      const skillsArray = skills.split(",").map((s) => s.trim());
      query.skills = { $in: skillsArray };
    }

    // filter by tools
    if (tools) {
      const toolsArray = tools.split(",").map((t) => t.trim());
      query.tools = { $in: toolsArray };
    }

    // filter by duration
    if (duration) {
      query.duration = duration.trim();
    }

    // filter by instructor name
    if (instructorName) {
      query.instructorName = { $regex: instructorName, $options: "i" };
    }

    // filter by price
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // pagination related
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // sort the result
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // query the DB
    const courses = await Course.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .select("-enrolledStudents")
      .lean();

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / pageSize);

    return sendSuccessResponse(res, 200, "Courses retrieved successfully", {
      courses,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSize,
        totalCourses,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    return sendErrorResponse(res, 500, "Server error while fetching courses");
  }
};

// get courses for instrutor
const getInstructorCourses = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      includeInactive = 'false',
      category,
      duration,
      name,
      tool
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // Build query based on parameters
    const query = {
      instructorId: req.user._id
    };

    // Only add isActive filter if includeInactive is false
    if (includeInactive === 'false' || includeInactive === false) {
      query.isActive = true;
    }

    // Filter by category
    if (category && category.trim() !== '') {
      query.courseCategory = category.trim();
    }

    // Filter by duration
    if (duration && duration.trim() !== '') {
      query.duration = duration.trim();
    }

    // Filter by course name (case-insensitive search)
    if (name && name.trim() !== '') {
      query.courseName = { $regex: name.trim(), $options: 'i' };
    }

    // Filter by tool
    if (tool && tool.trim() !== '') {
      query.tools = { $in: [tool.trim()] };
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("enrolledStudents", "firstName lastName email")
      .lean();

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / pageSize);

    // Calculate counts for active and inactive courses
    const activeCourses = await Course.countDocuments({
      instructorId: req.user._id,
      isActive: true
    });
    const inactiveCourses = await Course.countDocuments({
      instructorId: req.user._id,
      isActive: false
    });

    return sendSuccessResponse(
      res,
      200,
      "Instructor courses retrieved successfully",
      {
        courses,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalCourses,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        summary: {
          activeCourses,
          inactiveCourses,
          totalCourses: activeCourses + inactiveCourses,
          showingInactive: includeInactive === 'true' || includeInactive === true
        },
        appliedFilters: {
          category: category || null,
          duration: duration || null,
          name: name || null,
          tool: tool || null
        }
      }
    );
  } catch (error) {
    console.error("Get instructor courses error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while fetching instructor courses"
    );
  }
};

// get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate("instructorId", "firstName lastName email profileImage bio")
      .populate("enrolledStudents", "firstName lastName email profileImage")
      .lean();

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Only show active courses - no exceptions
    if (!course.isActive) {
      return sendErrorResponse(res, 404, "Course not found or no longer available");
    }

    return sendSuccessResponse(res, 200, "Course retrieved successfully", {
      course,
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    return sendErrorResponse(res, 500, "Server error while fetching course");
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Check if the instructor is the owner of the course
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(
        res,
        403,
        "You are not authorized to update this course"
      );
    }

    const {
      courseName,
      courseCategory,
      description,
      whatYouWillLearn,
      skills,
      tools,
      startingDate,
      duration,
      price,
      courseFlyerURL,
      isActive,
    } = req.body;

    // Update fields
    if (courseName) course.courseName = courseName;
    if (courseCategory) course.courseCategory = courseCategory;
    if (description) course.description = description;
    if (whatYouWillLearn !== undefined) course.whatYouWillLearn = whatYouWillLearn;
    if (skills) course.skills = skills;
    if (tools !== undefined) course.tools = tools;
    if (startingDate) course.startingDate = startingDate;
    if (duration) course.duration = duration;
    if (price !== undefined) course.price = price;
    if (courseFlyerURL) course.courseFlyerURL = courseFlyerURL;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    return sendSuccessResponse(res, 200, "Course updated successfully", {
      course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    return sendErrorResponse(res, 500, "Internal Server fail to update course");
  }
};

// delete the course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Check if the instructor is the owner of the course
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(
        res,
        403,
        "You are not authorized to delete this course"
      );
    }

    // Check if course has 10 or more enrolled students
    const enrolledStudentsCount = course.enrolledStudents
      ? course.enrolledStudents.length
      : 0;

    if (enrolledStudentsCount >= 10) {
      return sendErrorResponse(
        res,
        400,
        `Cannot delete course with ${enrolledStudentsCount} enrolled students. Courses with 10 or more enrolled students cannot be deleted.`
      );
    }

    // Soft delete using isActive=false
    course.isActive = false;
    await course.save();

    // hard delete: by course id
    // await Course.findByIdAndDelete(id);

    return sendSuccessResponse(res, 200, "Course deleted successfully");
  } catch (error) {
    console.error("Delete course error:", error);
    return sendErrorResponse(res, 500, "Server error while deleting course");
  }
};

// Deactivate course (mark as inactive without deletion)
const deactivateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Check if the instructor is the owner of the course
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(
        res,
        403,
        "You are not authorized to deactivate this course"
      );
    }

    // Check if already inactive
    if (!course.isActive) {
      return sendErrorResponse(res, 400, "Course is already inactive");
    }

    // Deactivate the course
    course.isActive = false;
    await course.save();

    return sendSuccessResponse(
      res,
      200,
      "Course deactivated successfully",
      {
        courseId: course._id,
        courseName: course.courseName,
        isActive: course.isActive,
      }
    );
  } catch (error) {
    console.error("Deactivate course error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while deactivating course"
    );
  }
};

// Reactivate course (mark as active)
const reactivateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Check if the instructor is the owner of the course
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return sendErrorResponse(
        res,
        403,
        "You are not authorized to reactivate this course"
      );
    }

    // Check if already active
    if (course.isActive) {
      return sendErrorResponse(res, 400, "Course is already active");
    }

    // Reactivate the course
    course.isActive = true;
    await course.save();

    return sendSuccessResponse(
      res,
      200,
      "Course reactivated successfully",
      {
        courseId: course._id,
        courseName: course.courseName,
        isActive: course.isActive,
      }
    );
  } catch (error) {
    console.error("Reactivate course error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while reactivating course"
    );
  }
};

// get course categories
const getCourseCategories = async (req, res) => {
  try {
    const categories = Course.getCategories();

    return sendSuccessResponse(
      res,
      200,
      "Course categories retrieved successfully",
      {
        categories,
      }
    );
  } catch (error) {
    console.error("Get categories error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while fetching categories"
    );
  }
};

// get tool list
const getToolsList = async (req, res) => {
  try {
    const tools = Course.getTools();

    return sendSuccessResponse(res, 200, "Tools list retrieved successfully", {
      tools,
    });
  } catch (error) {
    console.error("Get tools error:", error);
    return sendErrorResponse(res, 500, "Server error while fetching tools");
  }
};

// get duration list
const getDurationsList = async (req, res) => {
  try {
    const durations = Course.getDurations();

    return sendSuccessResponse(
      res,
      200,
      "Durations list retrieved successfully",
      {
        durations,
      }
    );
  } catch (error) {
    console.error("Get durations error:", error);
    return sendErrorResponse(res, 500, "Server error while fetching durations");
  }
};

// search course
const searchCourses = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      size = 10,
      category,
      minPrice,
      maxPrice,
      minRating,
      tools,
      duration,
      sortBy = 'rating',
      sortOrder = 'desc',
      useAI = 'auto', // 'auto', 'true', or 'false'
    } = req.query;

    // alow to browsing all courses with filters and sorting

    // 1. Validate and sanitize numeric parameters
    let validatedMinPrice = null;
    let validatedMaxPrice = null;
    let validatedMinRating = null;

    if (minPrice !== undefined && minPrice !== '') {
      validatedMinPrice = Number(minPrice);
      if (isNaN(validatedMinPrice) || validatedMinPrice < 0) {
        return sendErrorResponse(res, 400, "minPrice must be a valid non-negative number");
      }
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      validatedMaxPrice = Number(maxPrice);
      if (isNaN(validatedMaxPrice) || validatedMaxPrice < 0) {
        return sendErrorResponse(res, 400, "maxPrice must be a valid non-negative number");
      }
    }

    // Check price range validity
    if (validatedMinPrice !== null && validatedMaxPrice !== null && validatedMinPrice > validatedMaxPrice) {
      return sendErrorResponse(res, 400, "minPrice cannot be greater than maxPrice");
    }

    if (minRating !== undefined && minRating !== '') {
      validatedMinRating = Number(minRating);
      if (isNaN(validatedMinRating) || validatedMinRating < 0 || validatedMinRating > 5) {
        return sendErrorResponse(res, 400, "minRating must be a number between 0 and 5");
      }
    }

    // 2. Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(size) || 10));

    if (isNaN(pageNum) || pageNum < 1) {
      return sendErrorResponse(res, 400, "page must be a positive integer");
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
      return sendErrorResponse(res, 400, "size must be between 1 and 50");
    }

    // 3. Validate sortBy and sortOrder
    const validSortFields = ['rating', 'price', 'createdAt', 'numberOfUserEnrolled', 'enrollmentCount'];
    const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'rating';
    const validatedSortOrder = ['asc', 'desc'].includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    // 4. Sanitize search string to prevent regex injection
    let sanitizedSearch = search;
    if (search && typeof search === 'string') {
      // Limit search length to prevent DoS
      if (search.length > 200) {
        return sendErrorResponse(res, 400, "Search query is too long (max 200 characters)");
      }
      // Trim and remove excessive whitespace
      sanitizedSearch = search.trim().replace(/\s+/g, ' ');
    }

    // 5. Validate category, tools, duration strings
    if (category && typeof category !== 'string') {
      return sendErrorResponse(res, 400, "category must be a string");
    }

    if (tools && typeof tools !== 'string') {
      return sendErrorResponse(res, 400, "tools must be a string");
    }

    if (duration && typeof duration !== 'string') {
      return sendErrorResponse(res, 400, "duration must be a string");
    }

    // Save search history for authenticated users
    if (req.user) {
      try {
        // Check current search history count for this user
        const searchCount = await SearchHistory.countDocuments({
          userId: req.user._id,
        });

        console.log(`[SearchHistory] User ${req.user._id} has ${searchCount} searches`);

        // If user has 10 or more searches, delete the oldest ones
        const MAX_SEARCH_HISTORY = 10;
        if (searchCount >= MAX_SEARCH_HISTORY) {
          const excessCount = searchCount - (MAX_SEARCH_HISTORY - 1);
          // console.log(`[SearchHistory] Need to delete ${excessCount} old searches`);

          const oldestSearches = await SearchHistory.find({
            userId: req.user._id,
          })
            .sort({ createdAt: 1 })
            .limit(excessCount)
            .select("_id");

          const idsToDelete = oldestSearches.map((search) => search._id);
          // console.log(`[SearchHistory] Deleting IDs:`, idsToDelete);

          const deleteResult = await SearchHistory.deleteMany({ _id: { $in: idsToDelete } });
          // console.log(`[SearchHistory] Deleted ${deleteResult.deletedCount} searches`);
        }

        // Create new search history entry (only if search query exists)
        if (sanitizedSearch) {
          await SearchHistory.create({
            userId: req.user._id,
            searchQuery: sanitizedSearch,
            searchType: "course_search",
            filters: {
              category: category || undefined,
              minPrice: validatedMinPrice,
              maxPrice: validatedMaxPrice,
              minRating: validatedMinRating,
              tools: tools || undefined,
              duration: duration || undefined,
            },
          });
          console.log(`[SearchHistory] Created new search entry for query: "${sanitizedSearch}"`);
        }
      } catch (searchError) {
        console.error("Error saving search history:", searchError);
      }
    }

    // === AI-POWERED SEARCH INTEGRATION ===
    const isAuthenticated = req.user && req.user._id;
    const userId = isAuthenticated ? req.user._id : null;

    // Detect if query looks like a natural language question
    const isNaturalLanguageQuery = sanitizedSearch && (
      sanitizedSearch.toLowerCase().includes('i want') ||
      sanitizedSearch.toLowerCase().includes('how to') ||
      sanitizedSearch.toLowerCase().includes('should i') ||
      sanitizedSearch.toLowerCase().includes('what course') ||
      sanitizedSearch.toLowerCase().includes('best course') ||
      sanitizedSearch.toLowerCase().includes('become a') ||
      sanitizedSearch.toLowerCase().includes('learn to') ||
      sanitizedSearch.split(' ').length > 5 // Long queries are likely natural language
    );

    const shouldUseAI = (
      (useAI === 'true') ||
      (useAI === 'auto' && isNaturalLanguageQuery && sanitizedSearch)
    );

    // Try AI-powered search if conditions are met (requires authentication)
    if (shouldUseAI && sanitizedSearch && isAuthenticated) {
      try {
        const userLimitCheck = await checkUserRequestLimit(userId);
        const userUsage = await getUserUsageSummary(userId);
        const apiStats = getAPIUsageStats();

        if (userLimitCheck.canMakeRequest) {
          console.log(`[AI Search Integration] Using AI for query: "${sanitizedSearch}"`);

          // Get user's enrolled courses for context
          const enrolledCourses = await Course.find({
            enrolledStudents: userId,
            isActive: true,
          })
            .select("courseName courseCategory skills tools")
            .lean();

          // Fetch all active courses for AI to analyze
          let aiQuery = { isActive: true };

          // Apply filters if provided
          if (category) aiQuery.courseCategory = category;
          if (validatedMinPrice !== null || validatedMaxPrice !== null) {
            aiQuery.price = {};
            if (validatedMinPrice !== null) aiQuery.price.$gte = validatedMinPrice;
            if (validatedMaxPrice !== null) aiQuery.price.$lte = validatedMaxPrice;
          }
          if (validatedMinRating !== null) aiQuery.rating = { $gte: validatedMinRating };
          if (tools) aiQuery.tools = { $regex: tools, $options: "i" };
          if (duration) aiQuery.duration = { $regex: `^${duration}$`, $options: "i" };

          const allCourses = await Course.find(aiQuery)
            .select(
              "courseName courseCategory description whatYouWillLearn skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL numberOfUserEnrolled"
            )
            .lean();

          const userContext = enrolledCourses.length > 0 ? { enrolledCourses } : null;
          const recommendedCourseIds = await generateAISearchRecommendations(
            sanitizedSearch,
            allCourses,
            userContext
          );

          if (recommendedCourseIds && recommendedCourseIds.length > 0) {
            // AI search successful - return AI-ordered results
            const courseMap = new Map(
              allCourses.map(course => [course._id.toString(), course])
            );

            let aiSortedCourses = recommendedCourseIds
              .map(id => courseMap.get(id))
              .filter(course => course !== undefined);

            // Only return AI-recommended courses for focused, relevant results

            // Apply pagination
            const skip = (pageNum - 1) * pageSize;
            const paginatedCourses = aiSortedCourses.slice(skip, skip + pageSize);
            const totalCourses = aiSortedCourses.length;
            const totalPages = Math.ceil(totalCourses / pageSize);

            const updatedApiStats = getAPIUsageStats();
            return sendSuccessResponse(res, 200, "AI-powered search results retrieved", {
              courses: paginatedCourses,
              pagination: {
                currentPage: pageNum,
                pageSize: pageSize,
                totalCourses,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
              },
              searchQuery: sanitizedSearch || '',
              recommendationType: 'ai-powered',
              authenticated: true,
              apiUsage: {
                global: {
                  used: updatedApiStats.totalCalls,
                  remaining: updatedApiStats.remainingCalls,
                  limit: updatedApiStats.maxCalls,
                  percentageUsed: updatedApiStats.percentageUsed,
                },
                personal: {
                  used: userUsage.dailyRequestsUsed + 1,
                  remaining: userUsage.remainingRequests - 1,
                  limit: userUsage.dailyRequestsLimit,
                  hoursUntilReset: userUsage.hoursUntilReset,
                },
              },
            });
          }
        } else {
          console.log(`[AI Search Integration] User ${userId} has reached daily AI limit, falling back to keyword search`);
        }
      } catch (aiError) {
        console.error("AI search integration error, falling back to keyword search:", aiError);
        // Continue with regular search on error
      }
    }

    // === FALLBACK TO REGULAR KEYWORD SEARCH ===
    // Build flexible search query with pattern matching
    let searchConditions = [];

    // Only build search conditions if search query is provided
    if (sanitizedSearch) {
      // Extract meaningful keywords from natural language queries
      let normalizedSearch = sanitizedSearch;

      // If this looks like a natural language question, extract keywords
      if (isNaturalLanguageQuery) {
        // Remove common filler words but keep important ones
        const stopWords = ['i', 'want', 'wants', 'to', 'be', 'a', 'an', 'the', 'how', 'what', 'should', 'course', 'courses', 'learn', 'become', 'get', 'follow'];
        const words = sanitizedSearch.toLowerCase().split(/\s+/);
        const keywords = words.filter(word =>
          word.length > 2 && !stopWords.includes(word)
        );

        // Use extracted keywords if we found any, otherwise keep original
        if (keywords.length > 0) {
          normalizedSearch = keywords.join(' ');
          console.log(`[Keyword Extraction] Original: "${sanitizedSearch}" -> Keywords: "${normalizedSearch}"`);
        } else {
          // If all words were filtered out, use the original query
          console.log(`[Keyword Extraction] No keywords found, using original: "${sanitizedSearch}"`);
        }
      }

      // Split search into individual words for partial matching
      const searchWords = normalizedSearch.split(' ').filter(word => word.length > 0);

      // Detect if search query is a duration pattern (e.g., "1 week", "6 weeks", "3 months")
      const durationPattern = /^(\d+)\s*(week|weeks|month|months|day|days|hour|hours)$/i;
      const isDurationQuery = durationPattern.test(normalizedSearch);

      // This allows for partial matches and handles spacing issues
      const wordPatterns = searchWords.map(word => {
        // Escape special regex characters
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Create patern that allows for flexible matching
        return new RegExp(escapedWord, 'i');
      });

      // If it's a duration query, use exact matching for duration field
      if (isDurationQuery) {
        // Extract number and unit for flexible matching (handles "1 week" vs "1 weeks")
        const match = normalizedSearch.match(durationPattern);
        const number = match[1];
        const unit = match[2].toLowerCase();

        // Normalize unit to handle singular/plural (week/weeks)
        const normalizedUnit = unit.endsWith('s') ? unit : unit + 's?';

        // Create exact duration pattern: "X week(s)" or "X weeks"
        const exactDurationPattern = `^${number}\\s*${normalizedUnit}$`;

        searchConditions.push(
          { duration: { $regex: exactDurationPattern, $options: "i" } }
        );

        // Also search in other fields in case duration is mentioned in description
        searchConditions.push(
          { courseName: { $regex: normalizedSearch, $options: "i" } },
          { description: { $regex: normalizedSearch, $options: "i" } },
          { whatYouWillLearn: { $regex: normalizedSearch, $options: "i" } }
        );
      } else {
        // Standard flexible search logic for non-duration queries

        // 1. Exact phrase match (highest priority) - remove spaces for flexibility
        const noSpaceSearch = normalizedSearch.replace(/\s+/g, '');
        searchConditions.push(
          { courseName: { $regex: normalizedSearch, $options: "i" } },
          { description: { $regex: normalizedSearch, $options: "i" } },
          { skills: { $regex: normalizedSearch, $options: "i" } },
          { tools: { $regex: normalizedSearch, $options: "i" } },
          { instructorName: { $regex: normalizedSearch, $options: "i" } },
          { courseCategory: { $regex: normalizedSearch, $options: "i" } },
          { whatYouWillLearn: { $regex: normalizedSearch, $options: "i" } },
          { duration: { $regex: normalizedSearch, $options: "i" } }
        );

        // 2. Match with spaces removed (handles "webdevelopment" vs "web development")
        if (normalizedSearch.includes(' ') || noSpaceSearch !== normalizedSearch) {
          const noSpacePattern = noSpaceSearch.split('').join('\\s*');
          searchConditions.push(
            { courseName: { $regex: noSpacePattern, $options: "i" } },
            { description: { $regex: noSpacePattern, $options: "i" } },
            { skills: { $regex: noSpacePattern, $options: "i" } },
            { tools: { $regex: noSpacePattern, $options: "i" } },
            { courseCategory: { $regex: noSpacePattern, $options: "i" } },
            { whatYouWillLearn: { $regex: noSpacePattern, $options: "i" } },
            { duration: { $regex: noSpacePattern, $options: "i" } }
          );
        }

        // 3. Individual word matches (handles partial searches like "web developer", "data scientist")
        if (searchWords.length >= 2) {
          // For multi-word searches, also search for individual words
          searchWords.forEach(word => {
            if (word.length > 3) { // Only search for words longer than 3 characters
              searchConditions.push(
                { courseName: { $regex: word, $options: "i" } },
                { description: { $regex: word, $options: "i" } },
                { courseCategory: { $regex: word, $options: "i" } },
                { skills: { $regex: word, $options: "i" } },
                { tools: { $regex: word, $options: "i" } }
              );
            }
          });
        }
      }
    }

    // Build base query
    let query = {
      isActive: true,
    };

    // Only add $or condition if there are search conditions
    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }

    // Apply filters
    if (category) {
      query.courseCategory = category;
    }

    // Use validated price values
    if (validatedMinPrice !== null || validatedMaxPrice !== null) {
      query.price = {};
      if (validatedMinPrice !== null) query.price.$gte = validatedMinPrice;
      if (validatedMaxPrice !== null) query.price.$lte = validatedMaxPrice;
    }

    // Use validated rating value
    if (validatedMinRating !== null) {
      query.rating = { $gte: validatedMinRating };
    }

    // Filter by tools (match if the tools array contains the specified tool)
    if (tools) {
      query.tools = { $regex: tools, $options: "i" };
    }

    // Filter by duration (exact match)
    if (duration) {
      query.duration = { $regex: `^${duration}$`, $options: "i" };
    }

    // Pagination (using validated values from above)
    const skip = (pageNum - 1) * pageSize;

    // Dynamic sorting (using validated values from above)
    const actualSortField = validatedSortBy === 'enrollmentCount' ? 'numberOfUserEnrolled' : validatedSortBy;
    const sortDirection = validatedSortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [actualSortField]: sortDirection };

    // Add secondary sort by createdAt for consistency
    if (actualSortField !== 'createdAt') {
      sortOptions.createdAt = -1;
    }

    const courses = await Course.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .select("-enrolledStudents")
      .lean();

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / pageSize);

    // Build response data
    const responseData = {
      courses,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSize,
        totalCourses,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      searchQuery: sanitizedSearch || '',
      recommendationType: 'keyword-based',
      authenticated: !!isAuthenticated, // Convert to boolean
    };

    // Add message for non-authenticated users who tried natural language query
    if (!isAuthenticated && isNaturalLanguageQuery) {
      responseData.message = 'Login to get AI-powered course recommendations for your query';
    }

    return sendSuccessResponse(res, 200, "Search results retrieved", responseData);
  } catch (error) {
    console.error("Search courses error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error fail to searching courses"
    );
  }
};

// student enrole to course
const enrollInCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    if (!course.isActive) {
      return sendErrorResponse(res, 400, "This course is no longer available");
    }

    // Check if already enrolled
    if (course.enrolledStudents.includes(req.user._id)) {
      return sendErrorResponse(res, 400, "Already enrolled in this course");
    }

    // Add stdent to enrolled students
    course.enrolledStudents.push(req.user._id);
    course.numberOfUserEnrolled = course.enrolledStudents.length;
    await course.save();

    // Prepare course details for email
    const courseDetails = {
      startingDate: course.startingDate,
      duration: course.duration,
      description: course.description,
      price: course.price,
      courseFlyerURL: course.courseFlyerURL,
      skills: course.skills,
      tools: course.tools,
    };

    // Send enrollment confirmation email
    const userName = `${req.user.firstName} ${req.user.lastName}`;
    const { sendEnrollmentEmail } = require("../services/email.service");

    // Send email
    sendEnrollmentEmail(
      req.user.email,
      userName,
      course.courseName,
      course.instructorName,
      courseDetails
    ).catch((error) => {
      console.error("Failed to send enrollment email:", error);
    });

    return sendSuccessResponse(res, 200, "Successfully enrolled in course", {
      courseId: course._id,
      courseName: course.courseName,
      startingDate: course.startingDate,
      message: "A confirmation email has been sent to your email address",
    });
  } catch (error) {
    console.error("Enroll in course error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Fail to enrolling in course"
    );
  }
};

// Unenroll from a course
const unenrollFromCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // Check if student is enrolled
    if (!course.enrolledStudents.includes(req.user._id)) {
      return sendErrorResponse(
        res,
        400,
        "You are not enrolled in this course"
      );
    }

    // Remove student from enrolled students
    course.enrolledStudents = course.enrolledStudents.filter(
      (studentId) => studentId.toString() !== req.user._id.toString()
    );
    course.numberOfUserEnrolled = course.enrolledStudents.length;
    await course.save();

    return sendSuccessResponse(
      res,
      200,
      "Successfully unenrolled from course",
      {
        courseId: course._id,
        courseName: course.courseName,
        message: "You have been unenrolled from this course",
      }
    );
  } catch (error) {
    console.error("Unenroll from course error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Failed to unenroll from course"
    );
  }
};

// get enrolled course
const getEnrolledCourses = async (req, res) => {
  try {
    const { page = 1, size = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    const query = {
      enrolledStudents: req.user._id,
      isActive: true,
    };

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("-enrolledStudents")
      .lean();

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / pageSize);

    return sendSuccessResponse(
      res,
      200,
      "Enrolled courses retrieved successfully",
      {
        courses,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalCourses,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      }
    );
  } catch (error) {
    console.error("Get enrolled courses error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Faile to fetching enrolled courses"
    );
  }
};

// AI-powered course search using ChatGPT
const aiSearchCourses = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      size = 10,
      useAI = 'true'
    } = req.query;

    if (!query || query.trim() === '') {
      return sendErrorResponse(res, 400, "Search query is required");
    }

    const sanitizedQuery = query.trim();
    const isAuthenticated = req.user && req.user._id;
    const userId = isAuthenticated ? req.user._id : null;

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));

    // Save search history for authenticated users
    if (isAuthenticated) {
      try {
        const searchCount = await SearchHistory.countDocuments({
          userId: req.user._id,
        });

        console.log(`[AI Search History] User ${req.user._id} has ${searchCount} searches`);

        const MAX_SEARCH_HISTORY = 10;
        if (searchCount >= MAX_SEARCH_HISTORY) {
          const excessCount = searchCount - (MAX_SEARCH_HISTORY - 1);
          const oldestSearches = await SearchHistory.find({
            userId: req.user._id,
          })
            .sort({ createdAt: 1 })
            .limit(excessCount)
            .select("_id");

          const idsToDelete = oldestSearches.map((search) => search._id);
          await SearchHistory.deleteMany({ _id: { $in: idsToDelete } });
        }

        await SearchHistory.create({
          userId: req.user._id,
          searchQuery: sanitizedQuery,
          searchType: "ai_course_search",
          filters: {},
        });
        console.log(`[AI Search History] Created new search entry for query: "${sanitizedQuery}"`);
      } catch (searchError) {
        console.error("Error saving AI search history:", searchError);
      }
    }

    // Fetch all active courses
    const allCourses = await Course.find({ isActive: true })
      .select(
        "courseName courseCategory description whatYouWillLearn skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL numberOfUserEnrolled"
      )
      .lean();

    if (allCourses.length === 0) {
      return sendSuccessResponse(res, 200, "No courses available", {
        courses: [],
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalCourses: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        searchQuery: sanitizedQuery,
        recommendationType: "none",
      });
    }

    let sortedCourses = [];
    let recommendationType = "keyword-based";
    let errorMessage = null;
    let apiUsageInfo = null;

    // Check if user wants AI recommendations and if authenticated user can use AI
    const shouldUseAI = useAI === 'true' || useAI === true;

    if (shouldUseAI && isAuthenticated) {
      // Check if user can make a ChatGPT request (per-user limit check)
      const userLimitCheck = await checkUserRequestLimit(userId);
      const userUsage = await getUserUsageSummary(userId);
      const apiStats = getAPIUsageStats();

      apiUsageInfo = {
        global: {
          used: apiStats.totalCalls,
          remaining: apiStats.remainingCalls,
          limit: apiStats.maxCalls,
          percentageUsed: apiStats.percentageUsed,
        },
        personal: {
          used: userUsage.dailyRequestsUsed,
          remaining: userUsage.remainingRequests,
          limit: userUsage.dailyRequestsLimit,
          hoursUntilReset: userUsage.hoursUntilReset,
        },
      };

      if (!userLimitCheck.canMakeRequest) {
        console.warn(
          `[AI Search - Per-User Limit] User ${userId} - Daily limit reached`
        );
        errorMessage = userLimitCheck.reason;
        recommendationType = "keyword-based";
        sortedCourses = allCourses;
      } else {
        // Try AI-powered search
        try {
          // Get user's enrolled courses for context
          let userContext = null;
          if (isAuthenticated) {
            const enrolledCourses = await Course.find({
              enrolledStudents: userId,
              isActive: true,
            })
              .select("courseName courseCategory skills tools")
              .lean();

            if (enrolledCourses.length > 0) {
              userContext = { enrolledCourses };
            }
          }

          const recommendedCourseIds = await generateAISearchRecommendations(
            sanitizedQuery,
            allCourses,
            userContext
          );

          if (recommendedCourseIds && recommendedCourseIds.length > 0) {
            // Sort courses based on AI recommendation order
            const courseMap = new Map(
              allCourses.map(course => [course._id.toString(), course])
            );

            sortedCourses = recommendedCourseIds
              .map(id => courseMap.get(id))
              .filter(course => course !== undefined);

            recommendationType = "ai-powered";

            // If AI didn't return enough courses, add keyword-based results
            if (sortedCourses.length < allCourses.length) {
              const existingIds = new Set(sortedCourses.map(c => c._id.toString()));
              const additionalCourses = allCourses
                .filter(c => !existingIds.has(c._id.toString()));
              sortedCourses = [...sortedCourses, ...additionalCourses];
            }
          } else {
            // AI returned empty, fallback to keyword-based
            sortedCourses = allCourses;
            recommendationType = "keyword-based";
          }

          // Update API usage info after AI call
          const updatedApiStats = getAPIUsageStats();
          apiUsageInfo.global = {
            used: updatedApiStats.totalCalls,
            remaining: updatedApiStats.remainingCalls,
            limit: updatedApiStats.maxCalls,
            percentageUsed: updatedApiStats.percentageUsed,
          };
        } catch (error) {
          console.error("AI search error:", error);

          if (error.message === "API_LIMIT_REACHED") {
            recommendationType = "keyword-based";
            errorMessage = "Global AI search limit reached. Showing keyword-based results.";
          } else {
            recommendationType = "keyword-based";
            errorMessage = "AI search temporarily unavailable. Showing keyword-based results.";
          }

          sortedCourses = allCourses;
        }
      }
    } else {
      // Non-authenticated users or AI disabled - use keyword-based search
      sortedCourses = allCourses;

      if (!isAuthenticated && shouldUseAI) {
        errorMessage = "Login to use AI-powered course search";
      }
    }

    // Apply keyword filtering if using keyword-based search
    if (recommendationType === "keyword-based") {
      const searchLower = sanitizedQuery.toLowerCase();
      sortedCourses = sortedCourses.filter(course => {
        return (
          course.courseName.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.courseCategory.toLowerCase().includes(searchLower) ||
          course.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
          course.tools.some(tool => tool.toLowerCase().includes(searchLower)) ||
          (course.instructorName && course.instructorName.toLowerCase().includes(searchLower))
        );
      });

      // Sort by rating
      sortedCourses.sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.totalRatings - a.totalRatings;
      });
    }

    // Apply pagination
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCourses = sortedCourses.slice(startIndex, endIndex);
    const totalCourses = sortedCourses.length;
    const totalPages = Math.ceil(totalCourses / pageSize);

    const responseData = {
      courses: paginatedCourses,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSize,
        totalCourses,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      searchQuery: sanitizedQuery,
      recommendationType,
      authenticated: isAuthenticated,
    };

    if (apiUsageInfo) {
      responseData.apiUsage = apiUsageInfo;
    }

    if (errorMessage) {
      responseData.message = errorMessage;
    }

    return sendSuccessResponse(
      res,
      200,
      recommendationType === "ai-powered"
        ? "AI-powered course search results"
        : "Course search results",
      responseData
    );
  } catch (error) {
    console.error("AI search courses error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while searching courses"
    );
  }
};

// Get instructor dashboard statistics
const getInstructorDashboard = async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get instructor details
    const instructor = await User.findById(instructorId).select(
      "firstName lastName email"
    );

    // Get instructor's courses only
    const instructorCourses = await Course.find({
      instructorId,
      isActive: true,
    }).lean();

    const totalCourses = instructorCourses.length;

    // Calculate total students enrolled in instructor's courses
    let totalStudentsEnrolled = 0;
    let courseStatistics = [];

    for (const course of instructorCourses) {
      const enrolledCount = course.enrolledStudents
        ? course.enrolledStudents.length
        : 0;
      totalStudentsEnrolled += enrolledCount;

      courseStatistics.push({
        courseId: course._id,
        courseName: course.courseName,
        courseCategory: course.courseCategory,
        enrolledStudents: enrolledCount,
        rating: course.rating,
        totalRatings: course.totalRatings,
        price: course.price,
        startingDate: course.startingDate,
        duration: course.duration,
      });
    }

    // Sort courses by enrolled students (most popular first)
    courseStatistics.sort((a, b) => b.enrolledStudents - a.enrolledStudents);

    // Get most popular course
    const mostPopularCourse =
      courseStatistics.length > 0 ? courseStatistics[0] : null;

    // Get highest rated course
    const highestRatedCourse = instructorCourses
      .filter((c) => c.rating > 0)
      .sort((a, b) => b.rating - a.rating)[0];

    // Calculate average rating across all instructor courses
    const coursesWithRatings = instructorCourses.filter((c) => c.rating > 0);
    const averageRating =
      coursesWithRatings.length > 0
        ? (
            coursesWithRatings.reduce((sum, c) => sum + c.rating, 0) /
            coursesWithRatings.length
          ).toFixed(2)
        : 0;

    // Calculate total revenue (estimated based on enrollments)
    const totalRevenue = instructorCourses.reduce((sum, course) => {
      const enrolledCount = course.enrolledStudents
        ? course.enrolledStudents.length
        : 0;
      return sum + course.price * enrolledCount;
    }, 0);

    // Get courses by category
    const coursesByCategory = instructorCourses.reduce((acc, course) => {
      const category = course.courseCategory;
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalEnrolled: 0,
        };
      }
      acc[category].count += 1;
      acc[category].totalEnrolled += course.enrolledStudents
        ? course.enrolledStudents.length
        : 0;
      return acc;
    }, {});

    const dashboardData = {
      instructor: {
        name: `${instructor.firstName} ${instructor.lastName}`,
        email: instructor.email,
      },
      overview: {
        totalCourses,
        totalStudents: totalStudentsEnrolled,
        averageRating: parseFloat(averageRating),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      },
      topCourses: {
        mostPopular: mostPopularCourse
          ? {
              courseId: mostPopularCourse.courseId,
              courseName: mostPopularCourse.courseName,
              enrolledStudents: mostPopularCourse.enrolledStudents,
            }
          : null,
        highestRated: highestRatedCourse
          ? {
              courseId: highestRatedCourse._id,
              courseName: highestRatedCourse.courseName,
              rating: highestRatedCourse.rating,
              totalRatings: highestRatedCourse.totalRatings,
            }
          : null,
      },
      coursesByCategory,
      allCourses: courseStatistics,
    };

    return sendSuccessResponse(
      res,
      200,
      "Instructor dashboard data retrieved successfully",
      dashboardData
    );
  } catch (error) {
    console.error("Get instructor dashboard error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while retrieving dashboard data"
    );
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getInstructorCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  deactivateCourse,
  reactivateCourse,
  getCourseCategories,
  getToolsList,
  getDurationsList,
  searchCourses,
  aiSearchCourses,
  enrollInCourse,
  unenrollFromCourse,
  getEnrolledCourses,
  getInstructorDashboard,
};
