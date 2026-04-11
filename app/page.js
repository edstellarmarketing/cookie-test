import { courses } from "./courses/data";
import Link from "next/link";

const colorMap = {
  blue: "bg-blue-50 border-blue-200 hover:border-blue-400",
  green: "bg-green-50 border-green-200 hover:border-green-400",
  purple: "bg-purple-50 border-purple-200 hover:border-purple-400",
  orange: "bg-orange-50 border-orange-200 hover:border-orange-400",
};

const badgeMap = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
};

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Professional Training Courses</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Advance your career with our industry-leading training programs.
          Fill the interest form on any course to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Link
            key={course.slug}
            href={`/courses/${course.slug}`}
            className={`block border-2 rounded-xl p-6 transition-all ${colorMap[course.color]}`}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeMap[course.color]}`}>
                {course.level}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4">{course.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Duration: {course.duration}</span>
              <span className="text-blue-600 font-medium">Learn more &rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
