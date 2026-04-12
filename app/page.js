"use client";

import { useState } from "react";
import { courses } from "./courses/data";
import Link from "next/link";

const COURSES_PER_PAGE = 6;

const colorMap = {
  blue: "bg-blue-50 border-blue-200 hover:border-blue-400",
  green: "bg-green-50 border-green-200 hover:border-green-400",
  purple: "bg-purple-50 border-purple-200 hover:border-purple-400",
  orange: "bg-orange-50 border-orange-200 hover:border-orange-400",
  red: "bg-red-50 border-red-200 hover:border-red-400",
  teal: "bg-teal-50 border-teal-200 hover:border-teal-400",
  indigo: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
  yellow: "bg-yellow-50 border-yellow-200 hover:border-yellow-400",
  pink: "bg-pink-50 border-pink-200 hover:border-pink-400",
  cyan: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
  slate: "bg-slate-50 border-slate-200 hover:border-slate-400",
  amber: "bg-amber-50 border-amber-200 hover:border-amber-400",
  lime: "bg-lime-50 border-lime-200 hover:border-lime-400",
  rose: "bg-rose-50 border-rose-200 hover:border-rose-400",
};

const badgeMap = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
  red: "bg-red-100 text-red-800",
  teal: "bg-teal-100 text-teal-800",
  indigo: "bg-indigo-100 text-indigo-800",
  yellow: "bg-yellow-100 text-yellow-800",
  pink: "bg-pink-100 text-pink-800",
  cyan: "bg-cyan-100 text-cyan-800",
  slate: "bg-slate-100 text-slate-800",
  amber: "bg-amber-100 text-amber-800",
  lime: "bg-lime-100 text-lime-800",
  rose: "bg-rose-100 text-rose-800",
};

export default function HomePage() {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(courses.length / COURSES_PER_PAGE);
  const start = (page - 1) * COURSES_PER_PAGE;
  const visible = courses.slice(start, start + COURSES_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Professional Training Courses</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Advance your career with our industry-leading training programs.
          Fill the interest form on any course to get started.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          {courses.length} courses available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((course) => (
          <Link
            key={course.slug}
            href={`/courses/${course.slug}`}
            className={`block border-2 rounded-xl p-6 transition-all ${colorMap[course.color] || colorMap.blue}`}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold leading-tight">{course.title}</h2>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2 ${badgeMap[course.color] || badgeMap.blue}`}>
                {course.level}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{course.duration}</span>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-900">${course.price}</span>
                <span className="text-xs text-gray-400 line-through">${course.originalPrice}</span>
              </div>
            </div>
            <div className="mt-3 text-right">
              <span className="text-blue-600 font-medium text-sm">Learn more &rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 text-sm rounded-lg font-medium transition-colors ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-4">
        Page {page} of {totalPages}
      </p>
    </div>
  );
}
