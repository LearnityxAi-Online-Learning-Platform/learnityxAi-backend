const { validationResult } = require("express-validator");
const Course = require("../models/Course.model");
const User = require("../models/User.model");
const SearchHistory = require("../models/SearchHistory.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");

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

        // If user has 15 or more searches, delete the oldest ones
        const MAX_SEARCH_HISTORY = 3; // TODO: Change back to 15 for production
        if (searchCount >= MAX_SEARCH_HISTORY) {
          const excessCount = searchCount - (MAX_SEARCH_HISTORY - 1); // Keep only (MAX-1), so we can add 1 new
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

    // Calculate counts for active and inactive courses (without additional filters)
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
    } = req.query;

    if (!search) {
      return sendErrorResponse(res, 400, "Search query is required");
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
          const excessCount = searchCount - (MAX_SEARCH_HISTORY - 1); // Keep only (MAX-1), so we can add 1 new
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

        // Create new search history entry
        await SearchHistory.create({
          userId: req.user._id,
          searchQuery: search,
          searchType: "course_search",
          filters: {
            category: category || undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            minRating: minRating ? Number(minRating) : undefined,
          },
        });
        console.log(`[SearchHistory] Created new search entry for query: "${search}"`);
      } catch (searchError) {
        console.error("Error saving search history:", searchError);
      }
    }

    // Build search query
    let query = {
      isActive: true,
      $or: [
        { courseName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
        { tools: { $regex: search, $options: "i" } },
        { instructorName: { $regex: search, $options: "i" } },
      ],
    };

    // Apply filters
    if (category) {
      query.courseCategory = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    const courses = await Course.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("-enrolledStudents")
      .lean();

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / pageSize);

    return sendSuccessResponse(res, 200, "Search results retrieved", {
      courses,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSize,
        totalCourses,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      searchQuery: search,
    });
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

    // Add student to enrolled students
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
  enrollInCourse,
  unenrollFromCourse,
  getEnrolledCourses,
  getInstructorDashboard,
};
