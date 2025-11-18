import React from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  Box,
  Typography,
  Divider,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import BlockIcon from "@mui/icons-material/Block";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

const agentImages = {
  guidance: "/ga_new.png",
  booking: "/hba_new.png",
  planner: "/pa_new.png",
};

const DocumentationSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Box
      className="documentation-content"
      sx={{
        p: 4,
        // maxWidth: 900,
        // mx: '2rem',
        bgcolor: isDark ? "#23272f" : "#fff",
        color: isDark ? "#f4f6fa" : "#2c3e50",
        borderRadius: 4,
        boxShadow: isDark ? 8 : 2,
        transition: "background 0.2s, color 0.2s",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          color: isDark ? "#e0c7b7" : "#795548",
          fontWeight: 700,
          justifyContent: "center",
          display: "flex",
          mb: 4,
        }}
      >
        AI-Assistance-FOE Agents Documentation
      </Typography>
      {/* <Typography
        variant="h5"
        gutterBottom
        sx={{ color: isDark ? "#e0c7b7" : "#4e342e", fontWeight: 600 }}
      >
        Overview
      </Typography> */}
      <Typography variant="body1" gutterBottom>
        AI-Assistance-FOE consists of three purpose-built agents:{" "}
        <b>Guidance Agent</b>, <b>Booking Agent</b>, and <b>Planner Agent</b>.
        Each agent is optimized for a focused set of tasks and provides a
        self-contained manual below describing its capabilities, recommended
        usage, and limitations.
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
        Access and visibility: agent manuals and UI access are intended to be
        role-aware (for example, students typically see the Guidance Agent).
        Role-based route protection and visibility controls are planned and will
        be enforced by backend role-based routes and permissions. At present
        these protections are not yet implemented; the documentation below
        therefore describes the intended visibility rules and best practices for
        each role.
      </Typography>
      <Divider sx={{ my: 4, borderColor: isDark ? "#795548" : "#e0c7b7" }} />

      {/* Guidance Agent */}
      <Card
        sx={{
          mb: 4,
          boxShadow: isDark ? 8 : 2,
          bgcolor: isDark ? "#23272f" : "#f9f6f2",
          borderRadius: 4,
        }}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography
              variant="h5"
              sx={{
                color: isDark ? "#ffd54f" : "#6d4c41",
                mt: 0,
                fontWeight: 700,
                fontSize: isDark ? "2rem" : "1.5rem",
              }}
            >
              Guidance Agent — User Manual
            </Typography>
            <Box display="flex" gap={4} alignItems="flex-start" flexWrap="wrap">
              <Box flex={1}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mb: 1,
                    fontSize: isDark ? "1.05rem" : "0.95rem",
                  }}
                >
                  <InfoIcon
                    fontSize="small"
                    sx={{
                      mr: 1,
                      verticalAlign: "middle",
                      color: isDark ? "#ffd54f" : "#795548",
                    }}
                  />
                  What is the Guidance Agent?
                </Typography>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{
                    color: "inherit",
                    fontSize: isDark ? "1.03rem" : "0.95rem",
                  }}
                >
                  The Guidance Agent is a student-focused conversational
                  assistant designed to answer questions about university
                  policies, procedures, academic resources, and other campus
                  services. It retrieves information from authoritative
                  documents (student handbook, exam manual, by-laws) and helps
                  users find the correct next steps.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  How to use the Guidance Agent (step‑by‑step)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon
                        sx={{ color: isDark ? "#ffd54f" : "#1976d2" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Open the Guidance Agent from the dashboard or sidebar."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon
                        sx={{ color: isDark ? "#ffd54f" : "#1976d2" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Type a clear, focused question in the chat input. Include context like course codes, dates or the document name when relevant."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon
                        sx={{ color: isDark ? "#ffd54f" : "#1976d2" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Optional: restrict the search to a specific source using the small filter tabs (Student handbook, Exam manual, By-law)."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon
                        sx={{ color: isDark ? "#ffd54f" : "#1976d2" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Press Enter or click Send. The agent will reply with an answer and (when applicable) cite source paragraphs and links."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon
                        sx={{ color: isDark ? "#ffd54f" : "#1976d2" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="If the answer requires action, follow links or check with the relevant office for confirmation."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Examples of good questions
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="What is the submission deadline for coursework in COMP101?"
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Can I request an extension for an exam due to illness? What is the process?"
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Where can I find the academic appeals procedure in the student handbook?"
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Capabilities
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon
                        sx={{ color: isDark ? "#ffd54f" : "#388e3c" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Answer questions by retrieving and summarizing relevant document passages."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon
                        sx={{ color: isDark ? "#ffd54f" : "#388e3c" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Provide links and citations to the student handbook, exam manual, and by-laws."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon
                        sx={{ color: isDark ? "#ffd54f" : "#388e3c" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary="Suggest next steps and official offices to contact for confirmation."
                      sx={{ color: "inherit" }}
                    />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  What the Guidance Agent cannot do (and when to escalate)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon
                        sx={{ color: isDark ? "#ffd54f" : "#fbc02d" }}
                      />
                    </ListItemIcon>
                    <ListItemText primary="Make binding administrative decisions or change official records — for these, contact the relevant administrative office." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon
                        sx={{ color: isDark ? "#ffd54f" : "#fbc02d" }}
                      />
                    </ListItemIcon>
                    <ListItemText primary="Provide legal, medical, or safety-critical advice — escalate to qualified personnel." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon
                        sx={{ color: isDark ? "#ffd54f" : "#fbc02d" }}
                      />
                    </ListItemIcon>
                    <ListItemText primary="Answer questions that are outside the provided document set; if the topic isn't covered, the agent may offer best-effort guidance but will flag uncertainty." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Privacy & Accuracy notes
                </Typography>
                <Typography variant="body2">
                  The Guidance Agent bases responses on stored documents and the
                  system's knowledge; verify sensitive or high-stakes
                  information with official sources. Personal data handling
                  follows the platform's privacy policy.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#ffe082" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Intended Audience & Visibility
                </Typography>
                <Typography variant="body2">
                  Primarily students and faculty advisors. Visibility should be
                  restricted via role-based routes so only matching users see
                  the Guidance Agent manual. (Role-based protection is planned
                  and not yet enforced.)
                </Typography>
              </Box>
              <Box
                sx={{
                  minWidth: 120,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Avatar
                  src={agentImages.guidance}
                  alt="Guidance Agent"
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 4,
                    boxShadow: isDark ? 8 : 2,
                    bgcolor: isDark ? "#23272f" : "#fff",
                    border: isDark ? "2px solid #ffd54f" : "2px solid #795548",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Divider sx={{ my: 4, borderColor: isDark ? "#795548" : "#e0c7b7" }} />
      {/* Booking Agent */}
      <Card
        sx={{
          mb: 4,
          boxShadow: isDark ? 8 : 2,
          bgcolor: isDark ? "#282c34" : "#f9f6f2",
          borderRadius: 4,
        }}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography
              variant="h5"
              sx={{
                color: isDark ? "#e0c7b7" : "#6d4c41",
                mt: 0,
                fontWeight: 700,
              }}
            >
              Booking Agent (Room Booking Assistant)
            </Typography>
            <Box display="flex" gap={4} alignItems="flex-start" flexWrap="wrap">
              <Box flex={1}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  <InfoIcon
                    fontSize="small"
                    sx={{ mr: 1, verticalAlign: "middle" }}
                  />
                  Summary
                </Typography>
                <Typography variant="body2" gutterBottom>
                  The Booking Agent automates room and resource reservations,
                  checks availability, suggests alternatives, and issues
                  confirmations. Intended for staff and students who manage or
                  request campus resources.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  What is the Booking Agent?
                </Typography>
                <Typography variant="body2" gutterBottom>
                  The Booking Agent is a conversational assistant that lets
                  users request and manage hall or room bookings through chat.
                  It integrates with the campus booking database to check
                  real-time availability, create provisional bookings when the
                  user confirms, and recommend best-fit alternatives when the
                  requested slot is unavailable.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  How to book a hall via chat (step‑by‑step)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Start a chat with the Booking Agent and state your request (date, start time, end time or duration)." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Include capacity, required equipment (projector, A/V, seating layout), and any location preferences." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="The agent checks availability and returns matching options with key details (room name, capacity, equipment, distance)." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="If you select an option and confirm, the agent creates the booking and returns a confirmation ID and summary (and sends email if configured)." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="If the requested slot is unavailable, the agent will propose ranked alternatives (times or rooms) and explain why each is a good fit." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Example booking requests
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="I need a hall for 80 people on 2025-12-10, 10:00–13:00 with a projector and theatre seating." />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Book the main lecture hall (LH-201) on 2025-11-25 from 14:00 for 2 hours. If not available, show nearest halls with similar capacity." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  How alternatives are chosen
                </Typography>
                <Typography variant="body2" gutterBottom>
                  When a requested slot is unavailable the agent ranks and
                  presents alternatives using these signals:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Capacity match: prefers rooms closest in size to the requested capacity." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Equipment match: rooms that already have the requested AV/setup are ranked higher." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Proximity & convenience: nearer rooms or those in the same building are preferred when capacity/equipment are similar." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Timing flexibility: earlier or later nearby time slots (same day or alternative dates) are suggested if they better fit availability." />
                  </ListItem>
                </List>
                <Typography variant="body2" gutterBottom>
                  Each alternative is shown with a short justification (e.g.,
                  "LH-105 — slightly smaller but has projector and is available
                  at 10:30–12:30"). This transparency helps users pick the best
                  fit.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Real-time availability checking" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Create and manage booking requests" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Suggest alternative times or rooms on conflicts" />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Usage Guidelines
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Provide exact date/time and any resource constraints when requesting a booking." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Review confirmations and administrative policy before finalizing resource allocations." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Creating timetables from halls and modules
                </Typography>
                <Typography variant="body2" gutterBottom>
                  The Planner Agent can generate an academic timetable and an
                  exam timetable from a provided list of modules and available
                  halls. Provide the agent with the following inputs via chat or
                  uploaded lists:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Halls: a list with hall IDs, capacity, equipment, and available time blocks or blackout periods." />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Modules: module code, expected student count, preferred days/times, instructor availability, and exam length/type." />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Constraints: hard constraints (no double-booking, room capacity) and soft preferences (preferred time windows, adjacency needs)." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  How to ask the Planner Agent to build timetables
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Tell the agent you want an 'academic timetable' or 'exam timetable' and attach or paste the halls and modules lists." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Specify constraints clearly: e.g., 'no classes on Fridays after 16:00' or 'Lab modules need adjacent rooms' and any priority ordering among constraints." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="The agent will produce a draft timetable, flag conflicts, and propose adjustments (time shifts, alternate rooms)." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Examples
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Generate an academic timetable for 2026 Spring using halls H1..H12 and modules: COMP101 (120 students), MATH210 (80), LAB300 (30, needs lab equipment)." />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Create an exam timetable for December exams: exam durations (2h/3h), no overlapping exams for courses with shared student cohorts, and avoid late evening slots." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Constraint handling and conflict resolution
                </Typography>
                <Typography variant="body2" gutterBottom>
                  The Planner Agent applies a constrained scheduling algorithm
                  that treats some inputs as hard constraints (e.g., room
                  capacity, instructor unavailability) and others as soft
                  preferences (e.g., preferred times). When conflicts arise the
                  agent will:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Report the conflicting items with clear explanations." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Propose ranked resolutions (move to nearest available slot, change room to one with required equipment, split large groups)." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Allow the user to accept, reject, or request alternative proposals interactively." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Output & exports
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Finalized timetables can be exported as CSV or iCal (when
                  configured). The agent will also provide a human-readable
                  summary and a JSON payload suitable for downstream systems.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Limitations
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary="Only covers rooms and resources registered in the database; external resources are out-of-scope." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary="Last-minute changes may require manual confirmation by administrators." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Intended Audience & Visibility
                </Typography>
                <Typography variant="body2">
                  Targeted at staff who manage bookings and students who request
                  resources. Visibility should be limited via role-based routes
                  so only permitted users can access booking functionality.
                </Typography>
              </Box>
              <Box
                sx={{
                  minWidth: 120,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Avatar
                  src={agentImages.booking}
                  alt="Booking Agent"
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 4,
                    boxShadow: isDark ? 8 : 2,
                    bgcolor: isDark ? "#23272f" : "#fff",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Divider sx={{ my: 4, borderColor: isDark ? "#795548" : "#e0c7b7" }} />

      {/* Planner Agent */}
      <Card
        sx={{
          mb: 4,
          boxShadow: isDark ? 8 : 2,
          bgcolor: isDark ? "#282c34" : "#f9f6f2",
          borderRadius: 4,
        }}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography
              variant="h5"
              sx={{
                color: isDark ? "#ffd54f" : "#6d4c41",
                mt: 0,
                fontWeight: 700,
                fontSize: isDark ? "2rem" : "1.5rem",
              }}
            >
              Planner Agent — User Manual
            </Typography>
            <Box display="flex" gap={4} alignItems="flex-start" flexWrap="wrap">
              <Box flex={1}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  <InfoIcon
                    fontSize="small"
                    sx={{ mr: 1, verticalAlign: "middle" }}
                  />
                  Summary
                </Typography>
                <Typography variant="body2" gutterBottom>
                  The Planner Agent assists with personal and academic planning:
                  creating tasks, setting reminders, and integrating schedules
                  to help users manage time effectively.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Capabilities
                </Typography>
                <List dense>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: isDark ? "#ffe082" : "#795548",
                      fontWeight: 600,
                      mb: 1,
                      fontSize: isDark ? "1.05rem" : "0.95rem",
                    }}
                  >
                    <InfoIcon
                      fontSize="small"
                      sx={{
                        mr: 1,
                        verticalAlign: "middle",
                        color: isDark ? "#ffd54f" : "#795548",
                      }}
                    />
                    Summary
                  </Typography>
                  <Typography
                    variant="body2"
                    gutterBottom
                    sx={{ color: "inherit" }}
                  >
                    The Planner Agent helps staff and academic planners create
                    practical, conflict-free academic and exam timetables by
                    combining module requirements, instructor availability, and
                    a list of available halls. It can also manage personal task
                    planning and reminders for users.
                  </Typography>

                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: isDark ? "#ffe082" : "#795548",
                      fontWeight: 600,
                      mt: 2,
                    }}
                  >
                    How to add halls & modules (what the agent expects)
                  </Typography>
                  <Typography
                    variant="body2"
                    gutterBottom
                    sx={{ color: "inherit" }}
                  >
                    Supply halls and modules either by pasting structured text
                    in chat or uploading CSV/JSON files. Minimum required
                    fields:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Halls: id, name, capacity, equipment (comma-separated), available_slots (optional)." />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Modules: code, title, expected_students, preferred_times (optional), instructor_unavailable (optional)." />
                    </ListItem>
                  </List>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      bgcolor: isDark ? "#1e2430" : "#f3f3f3",
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {`Example CSV (halls):
                hall_id,name,capacity,equipment,available_slots
                H1,Main Hall,120,projector;mic,"09:00-12:00;13:00-17:00"
                H2,Small Room,30,whiteboard,"09:00-17:00"`}
                  </Typography>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Usage Guidelines
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Provide deadlines and priority when creating tasks to get accurate scheduling suggestions." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PlayArrowIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Keep planner data up to date to maintain reliable reminders and analytics." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Limitations
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary="Effectiveness depends on user-provided data; inaccurate inputs produce weaker scheduling suggestions." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BlockIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary="External calendar integrations may require explicit user permissions and configuration." />
                  </ListItem>
                </List>

                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDark ? "#e0c7b7" : "#795548",
                    fontWeight: 600,
                    mt: 2,
                  }}
                >
                  Intended Audience & Visibility
                </Typography>
                <Typography variant="body2">
                  Intended for all users who want to manage tasks and schedules.
                  Visibility may be narrowed by role or organizational policies
                  (to be enforced by role-based routes in future updates).
                </Typography>
              </Box>
              <Box
                sx={{
                  minWidth: 120,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Avatar
                  src={agentImages.planner}
                  alt="Planner Agent"
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 4,
                    boxShadow: isDark ? 8 : 2,
                    bgcolor: isDark ? "#23272f" : "#fff",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Divider sx={{ my: 4, borderColor: isDark ? "#795548" : "#e0c7b7" }} />

      {/* <Typography
        variant="h5"
        sx={{
          color: isDark ? "#ffe0b2" : "#4e342e",
          fontWeight: 600,
          fontSize: isDark ? "2rem" : "1.5rem",
        }}
      >
        Contact & Support
      </Typography>
      <Typography
        variant="body1"
        gutterBottom
        sx={{
          color: 'inherit',
          fontSize: isDark ? "1.2rem" : "1rem",
        }}
      >
        For further assistance, contact the development team or refer to the
        README for setup instructions.
      </Typography> */}
    </Box>
  );
};

export default DocumentationSection;
