package main

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"helpdesk-scheduler/auth"
	"helpdesk-scheduler/handlers"
)

func RegisterRoutes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.Route("/api", func(r chi.Router){
		// Public routes
		r.Get("/health", handlers.HealthHandler)
		r.Post("/auth/login", handlers.Login)

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(auth.AuthMiddleware)

			r.Route("/schedule", func(r chi.Router) {
				r.Get("/lock", handlers.GetScheduleLock)
				r.Get("/{day}", handlers.GetScheduleByDay)
				r.Get("/{day}/{cwid}", handlers.GetScheduleByStudent)
				r.Post("/signup", handlers.SignUpForSlot)
				r.Delete("/remove", handlers.RemoveFromSlot)
				r.Post("/autofill", handlers.AutofillFromDay)
			})

			r.Route("/time-off", func(r chi.Router) {
				r.Post("/", handlers.CreateTimeOffRequest)
				r.Get("/student/{cwid}", handlers.GetTimeOffByStudent)
				r.Get("/day/{day}", handlers.GetTimeOffByDay)
				r.Delete("/{id}/{cwid}", handlers.DeleteTimeOffRequest)
			})

			// Attendance points (student view)
			r.Get("/attendance-points/me", handlers.GetMyPoints)

			// Timeclock correction requests
			r.Post("/timeclock", handlers.CreateTimeclockRequest)
			r.Get("/timeclock/student/{cwid}", handlers.GetTimeclockByStudent)

			r.Get("/students/{cwid}", handlers.GetStudent)
			r.Get("/kace/tickets", handlers.GetKACETickets)
			r.Get("/teams", handlers.GetAllTeams)
			r.Get("/teams/{id}", handlers.GetTeam)
			r.Get("/assignments/student/{cwid}", handlers.GetAssignmentsByStudent)
			r.Get("/badges/student-badges", handlers.GetAllStudentBadges)
			r.Get("/team-hours", handlers.GetAllTeamHours)

			// Admin-only routes
			r.Group(func(r chi.Router) {
				r.Use(auth.AdminOnly)

				// Students admin routes - registered individually to avoid
				// shadowing the authenticated GET /students/{cwid} above
				r.Get("/students", handlers.GetAllStudents)
				r.Post("/students", handlers.CreateStudent)
				r.Post("/students/import", handlers.ImportStudents)
				r.Delete("/students/{cwid}", handlers.DeleteStudent)
				r.Post("/students/assign/{cwid}/{role}", handlers.AssignStudentRole)

				// Badges admin routes - registered individually to avoid
				// shadowing the authenticated GET /badges/student-badges above
				r.Get("/badges", handlers.GetAllBadges)
				r.Get("/badges/{id}", handlers.GetBadge)
				r.Post("/badges", handlers.CreateBadge)
				r.Put("/badges/{id}", handlers.UpdateBadge)
				r.Delete("/badges/{id}", handlers.DeleteBadge)
				r.Post("/badges/assign/{cwid}/{id}", handlers.AssignBadge)
				r.Delete("/badges/revoke/{cwid}/{id}", handlers.RevokeBadge)

				// Teams admin routes - registered individually to avoid
				// shadowing the authenticated GET /teams above
				r.Post("/teams", handlers.CreateTeam)
				r.Put("/teams/{id}", handlers.UpdateTeam)
				r.Delete("/teams/{id}", handlers.DeleteTeam)

				r.Put("/schedule/lock", handlers.SetScheduleLock)
			r.Delete("/schedule/clear", handlers.ClearAllSchedule)

			// Time-off admin routes - registered individually to avoid
			// shadowing the authenticated /time-off subrouter above
			r.Get("/time-off/all", handlers.GetAllTimeOffRequests)
			r.Delete("/time-off/admin/{id}", handlers.AdminDeleteTimeOffRequest)
			r.Post("/time-off/admin/{id}/status", handlers.UpdateTimeOffStatus)
			r.Get("/time-off/admin/absences", handlers.GetAbsenceCounts)

			// Timeclock admin routes
			r.Get("/timeclock/all", handlers.GetAllTimeclockRequests)
			r.Put("/timeclock/{id}/resolve", handlers.ResolveTimeclockRequest)

			// Attendance points admin routes
			r.Post("/attendance-points", handlers.CreateAttendancePoint)
			r.Get("/attendance-points/all", handlers.GetAllAttendancePoints)
			r.Get("/attendance-points/summary", handlers.GetAllPointsSummary)
			r.Delete("/attendance-points/clear", handlers.DeleteAllAttendancePoints)

			// Team hours admin routes
			r.Put("/team-hours/{teamId}", handlers.SetTeamHours)

				r.Route("/assignments", func(r chi.Router) {
					r.Get("/", handlers.GetAllAssignments)
					r.Get("/team/{team_id}", handlers.GetAssignmentsByTeam)
					r.Post("/{cwid}/{team_id}", handlers.AssignStudent)
					r.Delete("/{cwid}/{team_id}", handlers.UnassignStudent)
				})
			})
		})
	})

	return r
}
