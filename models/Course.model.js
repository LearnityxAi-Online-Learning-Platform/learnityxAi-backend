const mongoose = require("mongoose");

const COURSE_CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "Artificial Intelligence",
  "Cloud Computing",
  "Cybersecurity",
  "DevOps",
  "Database Management",
  "UI/UX Design",
  "Digital Marketing",
  "Business Analytics",
  "Project Management",
  "Software Testing",
  "Blockchain",
  "Game Development",
  "Other",
];

const TOOLS = [
  "JavaScript",
  "Python",
  "Java",
  "React",
  "Node.js",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Git",
  "Jenkins",
  "Tableau",
  "Power BI",
  "Figma",
  "Adobe XD",
  "TensorFlow",
  "PyTorch",
  "Angular",
  "Vue.js",
  "Django",
  "Flask",
  "Spring Boot",
  "TypeScript",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
];

const DURATIONS = [
  "1 week",
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "6 weeks",
  "8 weeks",
  "10 weeks",
  "12 weeks",
  "3 months",
  "4 months",
  "5 months",
  "6 months",
  "9 months",
  "12 months",
  "Self-paced",
];

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
      maxlength: [200, "Course name cannot exceed 200 characters"],
    },
    courseCategory: {
      type: String,
      required: [true, "Course category is required"],
      enum: {
        values: COURSE_CATEGORIES,
        message: "{VALUE} is not a valid course category",
      },
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor ID is required"],
    },
    instructorName: {
      type: String,
      required: [true, "Instructor name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    whatYouWillLearn: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Each learning outcome cannot exceed 200 characters"],
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, "Total ratings cannot be negative"],
    },
    numberOfUserEnrolled: {
      type: Number,
      default: 0,
      min: [0, "Number of enrolled users cannot be negative"],
    },
    skills: [
      {
        type: String,
        required: [true, "At least one skill is required"],
        trim: true,
      },
    ],
    tools: [
      {
        type: String,
        enum: {
          values: TOOLS,
          message: "{VALUE} is not a valid tool",
        },
      },
    ],
    startingDate: {
      type: Date,
      required: [true, "Starting date is required"],
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      enum: {
        values: DURATIONS,
        message: "{VALUE} is not a valid duration",
      },
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    courseFlyerURL: {
      type: String,
      required: [true, "Course flyer URL is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// index the search params
courseSchema.index({ courseName: "text", description: "text" });
courseSchema.index({ courseCategory: 1 });
courseSchema.index({ instructorId: 1 });
courseSchema.index({ skills: 1 });
courseSchema.index({ tools: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ rating: -1 });

// enrollment count
courseSchema.virtual("enrolledCount").get(function () {
  return this.enrolledStudents.length;
});

// get categories list
courseSchema.statics.getCategories = function () {
  return COURSE_CATEGORIES;
};

// get tools list
courseSchema.statics.getTools = function () {
  return TOOLS;
};

// get course duration list
courseSchema.statics.getDurations = function () {
  return DURATIONS;
};

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
