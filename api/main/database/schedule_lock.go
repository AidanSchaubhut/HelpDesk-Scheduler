package database

func GetScheduleLock() (bool, error) {
	var locked bool
	err := DB.QueryRow("SELECT locked FROM schedule_lock WHERE id = 1").Scan(&locked)
	return locked, err
}

func SetScheduleLock(locked bool) error {
	_, err := DB.Exec("UPDATE schedule_lock SET locked = ? WHERE id = 1", locked)
	return err
}
