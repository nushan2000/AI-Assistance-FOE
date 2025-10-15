import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Input from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import axios from "axios";
import { useEffect } from "react";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles?.("dark", {
    backgroundColor: "#1A2027",
  }),
}));

// TabPanel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`timetable-tabpanel-${index}`}
      aria-labelledby={`timetable-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = Array.from(
  { length: 10 },
  (_, i) => `${8 + i}:00 - ${9 + i}:00`
);

// Timetable display table
function TimetableTable({ timetable }) {
  console.log("Timetable data:", timetable);
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            {days.map((day) => (
              <TableCell key={day}>{day}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {timeSlots.map((slotLabel, rowIdx) => (
            <TableRow key={slotLabel}>
              <TableCell>{slotLabel}</TableCell>
              {days.map((day) => {
                const slotModules = timetable?.[day]?.[rowIdx] || [];
                console.log(`Slot ${day} ${rowIdx}:`, slotModules);

                return (
                  <TableCell
                    key={day + "-" + rowIdx}
                    sx={{
                      backgroundColor: slotModules.length
                        ? "#1976d2"
                        : "transparent",
                      color: slotModules.length ? "white" : "inherit",
                      textAlign: "center",
                      fontWeight: slotModules.length ? 600 : "normal",
                      verticalAlign: "middle",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {slotModules.map((mod, i) => (
                      <div key={i}>
                        {mod.code} ({mod.hall})
                      </div>
                    ))}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function PlannerScreen() {
  const [tab, setTab] = React.useState(0);
  const [selectedFile, setSelectedFile] = React.useState(null);

  const semesters = [1, 3, 5, 7];
  const [calenderData, setCalenderData] = React.useState(
    semesters.map(() => ({}))
  );

  // This tracks the active semester number (e.g., 1, 3, 5, 7)
  const [semester, setSemester] = React.useState(semesters[0]);

  // Handle tab switching
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setSemester(semesters[newValue]); // Link tab index to actual semester
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };
  const [firstExamFile, setFirstExamFile] = React.useState(null);
  const handleExamFileChange = (event) => {
    setFirstExamFile(event.target.files[0]);
  };

  // File upload handler
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert(response.data);
      await getCalenderData(); // Refresh timetable
    } catch (error) {
      const message =
        error.response?.data || "Upload failed. Please try again.";
      alert(message);
      console.error("Upload failed:", error);
    }
  };
  const handleExamUpload = async () => {
    if (!firstExamFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", firstExamFile);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/uploadExam",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert(response.data);
      await getCalenderData(); // Refresh timetable
    } catch (error) {
      const message =
        error.response?.data || "Upload failed. Please try again.";
      alert(message);
      console.error("Upload failed:", error);
    }
  };

  // Fetch timetable data from backend
  const getCalenderData = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8080/api/solver-results"
      );
      const data = response.data || [];

      const dayMap = {
        Mon: "Monday",
        Tue: "Tuesday",
        Wed: "Wednesday",
        Thu: "Thursday",
        Fri: "Friday",
        Sat: "Saturday",
        Sun: "Sunday",
      };

      // Convert response data into timetable format
      const semesterTimetables = semesters.map((sem) => {
        const filtered = data.filter((entry) => entry.semester === sem);
        const timetable = {};

        filtered.forEach((entry) => {
          const dayName = dayMap[entry.day] || entry.day;
          if (!timetable[dayName]) timetable[dayName] = {};
          if (!timetable[dayName][entry.slot])
            timetable[dayName][entry.slot] = [];
          timetable[dayName][entry.slot].push({
            code: entry.code,
            hall: entry.hall,
          });
        });

        return timetable;
      });

      setCalenderData(semesterTimetables);
      console.log("Final timetable data:", semesterTimetables);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      setCalenderData(semesters.map(() => ({})));
    }
  };

  // Fetch when component loads or semester changes
  useEffect(() => {
    getCalenderData();
  }, [semester]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        {/* LEFT: Upload Section */}
        <Grid item xs={4}>
          <Item sx={{ height: "100%", boxSizing: "border-box" }}>
            <Typography variant="h6">Upload File</Typography>
            <label htmlFor="timetable-file">
              <Input
                id="timetable-file"
                type="file"
                sx={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Button variant="contained" component="span">
                Choose File
              </Button>
              {selectedFile && (
                <Typography variant="body2" sx={{ ml: 2, display: "inline" }}>
                  {selectedFile.name}
                </Typography>
              )}
            </label>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleUpload}
                disabled={!selectedFile}
              >
                Generate Timetable
              </Button>
            </Box>
          </Item>
        </Grid>
        {/* <Grid item xs={4}>
          <Item sx={{ height: "100%", boxSizing: "border-box" }}>
            <Typography variant="h6">Upload File</Typography>
            <label htmlFor="exam-file">
              <Input
                id="exam-file"
                type="file"
                sx={{ display: "none" }}
                onChange={handleExamFileChange}
              />
              <Button variant="contained" component="span">
                Choose File
              </Button>
              {firstExamFile && (
                <Typography variant="body2" sx={{ ml: 2, display: "inline" }}>
                  {firstExamFile.name}
                </Typography>
              )}
            </label>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleExamUpload}
                disabled={!firstExamFile}
              >
                Generate Exam Timetable
              </Button>
            </Box>
          </Item>
        </Grid> */}
        {/* RIGHT: Timetable Display */}
        <Grid item xs={8}>
          <Item sx={{ height: "100%", boxSizing: "border-box" }}>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              aria-label="Timetable Tabs"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              {semesters.map((s, i) => (
                <Tab key={s} label={`Semester ${s}`} />
              ))}
            </Tabs>

            {semesters.map((sem, idx) => (
              <TabPanel value={tab} index={idx} key={sem}>
                <TimetableTable timetable={calenderData[idx]} />
              </TabPanel>
            ))}
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
}
