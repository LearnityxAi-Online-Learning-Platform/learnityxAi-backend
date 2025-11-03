const { OpenAI } = require("openai");
const {
  canMakeAPICall,
  getRemainingCalls,
  logAPICall,
  getUsageSummary,
  initializeUsageTracking,
} = require("../utils/apiUsageTracker");

// Initialize API usage tracking on service load
initializeUsageTracking();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate course recommendations using ChatGPT
const generateCourseRecommendations = async (
  enrolledCourses,
  searchHistory,
  availableCourses
) => {
  // Check if we can make an API call
  if (!canMakeAPICall()) {
    const summary = getUsageSummary();
    console.error(
      `API call limit reached: ${summary.totalCalls}/${summary.maxCalls} calls used`
    );
    throw new Error("API_LIMIT_REACHED");
  }

  const remainingCalls = getRemainingCalls();
  console.log(
    `Making ChatGPT API call. Remaining calls: ${remainingCalls}/250`
  );

  let prompt = null;

  try {
    // Build optimized prompt with enrolled courses
    const enrolledCoursesText =
      enrolledCourses.length > 0
        ? enrolledCourses
            .map(
              (course) =>
                `${course.courseName} (Category: ${
                  course.courseCategory
                }, Skills: ${course.skills.join(", ")}, Rating: ${
                  course.rating
                }/5)`
            )
            .join("; ")
        : "None";

    // Build search queries text with all filter details
    const searchQueriesText =
      searchHistory.length > 0
        ? searchHistory
            .map((search) => {
              let query = search.searchQuery;
              const filters = [];

              if (search.filters) {
                if (search.filters.category) {
                  filters.push(`Category: ${search.filters.category}`);
                }
                if (search.filters.skills && search.filters.skills.length > 0) {
                  filters.push(`Skills: ${search.filters.skills.join(", ")}`);
                }
                if (search.filters.tools && search.filters.tools.length > 0) {
                  filters.push(`Tools: ${search.filters.tools.join(", ")}`);
                }
                if (search.filters.minPrice !== undefined || search.filters.maxPrice !== undefined) {
                  const priceRange = [];
                  if (search.filters.minPrice !== undefined) priceRange.push(`Min: $${search.filters.minPrice}`);
                  if (search.filters.maxPrice !== undefined) priceRange.push(`Max: $${search.filters.maxPrice}`);
                  filters.push(`Price: ${priceRange.join(", ")}`);
                }
                if (search.filters.minRating !== undefined) {
                  filters.push(`MinRating: ${search.filters.minRating}/5`);
                }
              }

              if (filters.length > 0) {
                query += ` [${filters.join(", ")}]`;
              }

              return query;
            })
            .join("; ")
        : "None";

    // Build available courses text with essential information
    const topCourses = availableCourses.slice(0, 50);
    const availableCoursesText = topCourses
      .map(
        (course) =>
          `ID: ${course._id}, Name: ${course.courseName}, Category: ${
            course.courseCategory
          }, Rating: ${course.rating}/5 (${
            course.totalRatings || 0
          } ratings), Skills: ${course.skills.join(
            ", "
          )}, Tools: ${course.tools.join(", ")}, Price: $${course.price}`
      )
      .join("\n");

    // Create optimized prompt for ChatGPT
    prompt = `You are an AI course recommendation expert.
Analyze the user's learning profile and suggest the best courses.

User's Enrolled Courses:
${enrolledCoursesText}

Recent Search Queries: ${searchQueriesText}

Available Courses:
${availableCoursesText}

Instructions:
1. Recommend up to 15 relevant courses.
2. Prioritize high ratings and relevant skills.
3. Output only JSON array of course IDs, no text.
4. Format: ["courseId1", "courseId2", ...]`;

    // Call ChatGPT API
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content:
            "You are a course recommendation AI. Respond only with a valid JSON array of course IDs. No explanations or additional text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 300,
    });

    // Log successful API call
    logAPICall("ChatGPT Course Recommendations", true, null, prompt);

    const content = response.choices[0].message.content.trim();

    // Parse the JSON response
    let recommendedCourseIds = [];
    try {
      recommendedCourseIds = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON array from text
      const match = content.match(/\[.*\]/s);
      if (match) {
        recommendedCourseIds = JSON.parse(match[0]);
      } else {
        console.error("Failed to parse ChatGPT response:", content);
        // API call was successful, but response parsing failed
        return [];
      }
    }

    // Validate that we got an array
    if (!Array.isArray(recommendedCourseIds)) {
      console.error("ChatGPT did not return an array:", recommendedCourseIds);
      return [];
    }

    console.log(
      `ChatGPT returned ${recommendedCourseIds.length} course recommendations`
    );

    return recommendedCourseIds;
  } catch (error) {
    console.error("ChatGPT API error:", error);

    // Log failed API call
    logAPICall("ChatGPT Course Recommendations", false, error, prompt);

    // Log specific error details
    if (error.response) {
      console.error("API Response Error:", error.response.data);
    }

    // Throw specific error for limit reached
    if (error.message === "API_LIMIT_REACHED") {
      throw error;
    }

    throw new Error("Failed to generate course recommendations");
  }
};

// Get API usage statistics
const getAPIUsageStats = () => {
  return getUsageSummary();
};

module.exports = {
  generateCourseRecommendations,
  getAPIUsageStats,
};
