-- Views — design §5.1.

-- derived result total (never a stored duplicate)
CREATE VIEW academy.v_student_results AS
SELECT sr.*, COALESCE(theory,0)+COALESCE(practical,0)+COALESCE(viva,0) AS total
FROM academy.examination_results sr;

-- Full job-holder shape. Person data is joined from the linked student (and
-- its first enrolment); the address is joined from the workplace; the
-- designation name is joined from the trade-wise designations table.
CREATE VIEW jobs.v_job_holders AS
SELECT jh.id,
	jh.student_id,
	s.mr_no,
	s.name,
	s.gender,
	bt.trade_id,
	t.name_en AS trade,
	jh.photo_url,
	jh.designation_id,
	d.name AS designation,
	w.id        AS workplace_id,
	w.name      AS workplace,
	w.address,
	jh.salary,
	bt.donor_id
FROM jobs.job_holders jh
JOIN academy.student_informations s ON s.id = jh.student_id
LEFT JOIN LATERAL (
	SELECT st.trade_id, b.donor_id
	  FROM academy.student_trades st
	  JOIN academy.batches b ON b.id = st.batch_id
	 WHERE st.student_id = s.id
	 ORDER BY st.created_at
	 LIMIT 1
) bt ON true
LEFT JOIN academy.trades t       ON t.id = bt.trade_id
LEFT JOIN jobs.designations d    ON d.id = jh.designation_id
LEFT JOIN jobs.workplaces w      ON w.id = jh.workplace_id;
