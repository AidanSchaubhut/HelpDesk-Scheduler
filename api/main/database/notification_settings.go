package database

type NotificationSettings struct {
	TimeOffNotify    bool `json:"time_off_notify"`
	TimeclockNotify  bool `json:"timeclock_notify"`
	AttendanceNotify bool `json:"attendance_notify"`
}

func GetNotificationSettings() (NotificationSettings, error) {
	var s NotificationSettings
	err := DB.QueryRow("SELECT time_off_notify, timeclock_notify, attendance_notify FROM notification_settings WHERE id = 1").
		Scan(&s.TimeOffNotify, &s.TimeclockNotify, &s.AttendanceNotify)
	return s, err
}

func SetNotificationSettings(s NotificationSettings) error {
	_, err := DB.Exec(
		"UPDATE notification_settings SET time_off_notify = ?, timeclock_notify = ?, attendance_notify = ? WHERE id = 1",
		s.TimeOffNotify, s.TimeclockNotify, s.AttendanceNotify,
	)
	return err
}
