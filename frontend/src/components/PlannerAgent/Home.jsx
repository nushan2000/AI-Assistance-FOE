import React from 'react'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import PlannerScreen from './plannerScreen'
import ExamTimeTable from './ExamTimeTable'

function Home() {
     const [value, setValue] = React.useState('1');
        const handleChange = (event, newValue) => { setValue(newValue); };
     
  return (
    // <div>ExamTimeTable</div>
    <Box sx={{ p: 2 }}>
         <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleChange} aria-label="lab API tabs example">
            <Tab label="Academic Timetable" value="1" />
            <Tab label="Exam Timetable" value="2" />
            {/* <Tab label="Item Three" value="3" /> */}
          </TabList>
        </Box>
        <TabPanel value="1">
            <PlannerScreen />
        </TabPanel>
        <TabPanel value="2">
            <ExamTimeTable />
        </TabPanel>
        {/* <TabPanel value="3">Item Three</TabPanel> */}
      </TabContext>
    </Box>
  )
}

export default Home