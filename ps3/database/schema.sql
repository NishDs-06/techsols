sqlCREATE TABLE IF NOT EXISTS baselines (

id SERIAL PRIMARY KEY,

service VARCHAR(50) NOT NULL,

metric VARCHAR(50) NOT NULL,

value FLOAT NOT NULL,

computed_at TIMESTAMP DEFAULT NOW(),

UNIQUE(service, metric)

);



CREATE TABLE IF NOT EXISTS incidents (

id SERIAL PRIMARY KEY,

incident_id VARCHAR(100) UNIQUE NOT NULL,

root_service VARCHAR(50),

anomaly_confidence FLOAT,

rca_score FLOAT,

affected_services TEXT,

applied_action VARCHAR(50),

remediation_detail TEXT,

sla_seconds INT,

actual_seconds FLOAT,

injected_at TIMESTAMP,

detected_at TIMESTAMP,

rca_completed_at TIMESTAMP,

remediation_started_at TIMESTAMP,

recovered_at TIMESTAMP,

paths TEXT,

created_at TIMESTAMP DEFAULT NOW()

);



CREATE TABLE IF NOT EXISTS service_metric_history (

id SERIAL PRIMARY KEY,

service VARCHAR(50) NOT NULL,

timestamp TIMESTAMP NOT NULL,

latency_p95 FLOAT,

error_rate FLOAT,

cpu FLOAT,

memory FLOAT,

request_rate FLOAT,

restart_count FLOAT,

replica_gap FLOAT,

pod_ready FLOAT,

p_value FLOAT,

anomaly_confidence FLOAT,

status VARCHAR(20)

);



CREATE INDEX idx_metric_history_service_time

ON service_metric_history(service, timestamp DESC);

CREATE INDEX idx_incidents_created

ON incidents(created_at DESC);

