import uvicorn
from fastapi import FastAPI
from db import get_incident_history, get_baselines

app = FastAPI(title="Cato DB Service")

@app.get("/incidents/history")
def history():
    return get_incident_history()

@app.get("/baselines")  
def baselines(): 
    return get_baselines()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)

try:
    from db import get_conn
    conn = get_conn()
    print("Connection Successful: Postgres is ready for the orchestrator.")
    conn.close()
except Exception as e:
    print(f"Connection Failed: {e}")