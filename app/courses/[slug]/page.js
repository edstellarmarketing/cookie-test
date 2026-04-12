import { courses } from "../data";
import { notFound } from "next/navigation";
import CourseForm from "@/components/CourseForm";
import AddToCartButton from "@/components/AddToCartButton";
import Link from "next/link";

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const course = courses.find((c) => c.slug === slug);
  if (!course) return {};
  return { title: `${course.title} | Training Courses` };
}

export default async function CoursePage({ params }) {
  const { slug } = await params;
  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/" className="text-blue-600 text-sm hover:underline mb-6 inline-block">
        ← Back to all courses
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
        <div className="flex gap-4 text-sm text-gray-500 mb-4">
          <span className="bg-gray-100 px-3 py-1 rounded-full">{course.level}</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">{course.duration}</span>
        </div>
        <p className="text-gray-600 text-lg leading-relaxed">{course.description}</p>
      </div>

      {/* Pricing + Add to Cart */}
      <div className="bg-white border-2 border-green-200 rounded-xl p-8 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Course Fee</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">${course.price}</span>
              <span className="text-lg text-gray-400 line-through">${course.originalPrice}</span>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save ${course.originalPrice - course.price}
              </span>
            </div>
          </div>
          <AddToCartButton
            slug={course.slug}
            courseTitle={course.title}
            price={course.price}
          />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
        <h2 className="text-xl font-semibold mb-2">Interested in this course?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Fill out the form below and we'll reach out with more details, pricing, and upcoming batch schedules.
        </p>
        <CourseForm slug={course.slug} courseTitle={course.title} />
      </div>
    </div>
  );
}
