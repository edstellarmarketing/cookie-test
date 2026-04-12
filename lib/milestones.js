// Milestone catalog — each type has a label, point value, and whether it can fire multiple times
export const MILESTONES = {
  form_submitted: { label: "Interest form submitted", points: 20, repeatable: false },
  first_visit: { label: "First tracked page visit", points: 5, repeatable: false },
  visits_5: { label: "5+ page visits", points: 10, repeatable: false },
  visits_15: { label: "15+ page visits", points: 15, repeatable: false },
  visits_30: { label: "30+ page visits", points: 20, repeatable: false },
  multi_course_viewed: { label: "Viewed 2+ different courses", points: 15, repeatable: false },
  course_explorer: { label: "Viewed all 4 courses", points: 25, repeatable: false },
  repeat_course_visit: { label: "Same course visited 3+ times", points: 20, repeatable: true },
  multi_day_visitor: { label: "Active on 2+ different days", points: 15, repeatable: false },
  weekly_visitor: { label: "Active on 5+ different days", points: 30, repeatable: false },
  re_engaged_after_gap: { label: "Returned after 2+ day gap", points: 20, repeatable: true },
  // Cart/payment milestones — detected by cart API endpoints
  cart_page_reached: { label: "Reached cart/checkout page", points: 30, repeatable: false },
  cart_abandoned: { label: "Cart abandoned (no payment)", points: -5, repeatable: false },
  payment_completed: { label: "Payment completed", points: 50, repeatable: false },
};

// Temperature classification from cumulative score
export function getTemperature(score) {
  if (score >= 70) return "Hot";
  if (score >= 30) return "Warm";
  return "Cold";
}

// Extract course slug from a page URL
function getCourseSlug(pageUrl) {
  try {
    const path = new URL(pageUrl).pathname;
    const match = path.match(/\/courses\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Pure function: given all visits and existing milestones for a lead,
 * returns an array of new milestones to insert.
 *
 * @param {Array} visits - All page_visits for the lead, ordered by visited_at ascending
 *   Each: { page_url: string, visited_at: string }
 * @param {Array} existingMilestones - Already-achieved milestones
 *   Each: { milestone_type: string, metadata: object }
 * @returns {Array} New milestones to insert
 *   Each: { milestone_type, milestone_label, points, metadata }
 */
export function evaluateMilestones(visits, existingMilestones) {
  const achieved = new Set(existingMilestones.map((m) => m.milestone_type));
  const newMilestones = [];

  const totalVisits = visits.length;

  // --- first_visit ---
  if (totalVisits >= 1 && !achieved.has("first_visit")) {
    newMilestones.push({
      milestone_type: "first_visit",
      milestone_label: MILESTONES.first_visit.label,
      points: MILESTONES.first_visit.points,
      metadata: {},
    });
  }

  // --- visit count thresholds ---
  const visitThresholds = [
    { count: 5, type: "visits_5" },
    { count: 15, type: "visits_15" },
    { count: 30, type: "visits_30" },
  ];
  for (const { count, type } of visitThresholds) {
    if (totalVisits >= count && !achieved.has(type)) {
      newMilestones.push({
        milestone_type: type,
        milestone_label: MILESTONES[type].label,
        points: MILESTONES[type].points,
        metadata: { total_visits: totalVisits },
      });
    }
  }

  // --- course-related milestones ---
  const courseSlugs = visits.map((v) => getCourseSlug(v.page_url)).filter(Boolean);
  const uniqueCourses = [...new Set(courseSlugs)];

  if (uniqueCourses.length >= 2 && !achieved.has("multi_course_viewed")) {
    newMilestones.push({
      milestone_type: "multi_course_viewed",
      milestone_label: MILESTONES.multi_course_viewed.label,
      points: MILESTONES.multi_course_viewed.points,
      metadata: { courses: uniqueCourses },
    });
  }

  if (uniqueCourses.length >= 4 && !achieved.has("course_explorer")) {
    newMilestones.push({
      milestone_type: "course_explorer",
      milestone_label: MILESTONES.course_explorer.label,
      points: MILESTONES.course_explorer.points,
      metadata: { courses: uniqueCourses },
    });
  }

  // --- repeat_course_visit (per course, 3+ visits) ---
  const courseVisitCounts = {};
  for (const slug of courseSlugs) {
    courseVisitCounts[slug] = (courseVisitCounts[slug] || 0) + 1;
  }
  const existingRepeatCourses = new Set(
    existingMilestones
      .filter((m) => m.milestone_type === "repeat_course_visit")
      .map((m) => m.metadata?.course_slug)
  );
  for (const [slug, count] of Object.entries(courseVisitCounts)) {
    if (count >= 3 && !existingRepeatCourses.has(slug)) {
      newMilestones.push({
        milestone_type: "repeat_course_visit",
        milestone_label: MILESTONES.repeat_course_visit.label,
        points: MILESTONES.repeat_course_visit.points,
        metadata: { course_slug: slug, visit_count: count },
      });
    }
  }

  // --- multi_day_visitor / weekly_visitor ---
  const uniqueDays = [
    ...new Set(visits.map((v) => new Date(v.visited_at).toDateString())),
  ];

  if (uniqueDays.length >= 2 && !achieved.has("multi_day_visitor")) {
    newMilestones.push({
      milestone_type: "multi_day_visitor",
      milestone_label: MILESTONES.multi_day_visitor.label,
      points: MILESTONES.multi_day_visitor.points,
      metadata: { unique_days: uniqueDays.length },
    });
  }

  if (uniqueDays.length >= 5 && !achieved.has("weekly_visitor")) {
    newMilestones.push({
      milestone_type: "weekly_visitor",
      milestone_label: MILESTONES.weekly_visitor.label,
      points: MILESTONES.weekly_visitor.points,
      metadata: { unique_days: uniqueDays.length },
    });
  }

  // --- re_engaged_after_gap (2+ day gap between visits) ---
  const existingGapTimestamps = new Set(
    existingMilestones
      .filter((m) => m.milestone_type === "re_engaged_after_gap")
      .map((m) => m.metadata?.return_visit_at)
  );
  if (visits.length >= 2) {
    for (let i = 1; i < visits.length; i++) {
      const prev = new Date(visits[i - 1].visited_at);
      const curr = new Date(visits[i].visited_at);
      const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (gapDays >= 2) {
        const returnKey = visits[i].visited_at;
        if (!existingGapTimestamps.has(returnKey)) {
          newMilestones.push({
            milestone_type: "re_engaged_after_gap",
            milestone_label: MILESTONES.re_engaged_after_gap.label,
            points: MILESTONES.re_engaged_after_gap.points,
            metadata: { gap_days: Math.floor(gapDays), return_visit_at: returnKey },
          });
          existingGapTimestamps.add(returnKey);
        }
      }
    }
  }

  return newMilestones;
}
