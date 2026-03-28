import { motion } from 'framer-motion';
import StatusBar from '../components/layout/StatusBar';
import ClusterVitals from '../components/layout/ClusterVitals';
import TopologyMap from '../components/topology/TopologyMap';
import BandwidthChart from '../components/charts/BandwidthChart';
import ServiceHealthList from '../components/services/ServiceHealthList';
import IncidentStrip from '../components/incident/IncidentStrip';
import SLATimer from '../components/incident/SLATimer';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const incident = useStore((s) => s.incident);
  const hasIncident = !!incident;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-base">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="w-full shrink-0">
        <StatusBar />
      </motion.div>

      <div className="flex-1 flex overflow-hidden w-full relative min-h-0">
        <motion.div
          className="w-[65%] h-full shrink-0 border-r border-border relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <TopologyMap />

          {/* SLA Timer — overlaid bottom-right of topology */}
          {hasIncident && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute bottom-5 right-5 bg-surface border border-border rounded-sm p-3"
            >
              <SLATimer />
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="w-[35%] h-full flex flex-col shrink-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.16 }}
        >
          {/* Cluster vitals */}
          <div className="shrink-0 border-b border-border">
            <ClusterVitals />
          </div>
          <div className="h-[230px] shrink-0 border-b border-border">
            <BandwidthChart />
          </div>
          <div className="flex-1 overflow-hidden">
            <ServiceHealthList />
          </div>
        </motion.div>
      </div>

      <IncidentStrip />
    </div>
  );
}
