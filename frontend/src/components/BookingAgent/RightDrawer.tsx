import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import IconButton from "@mui/material/IconButton";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

type SwapRequest = {
  id: number;
  from: string;
  to: string;
  message: string;
  isSender: boolean;
};

export default function RightDrawer() {
  const [open, setOpen] = React.useState(false);

  // Example data
  const [requests, setRequests] = React.useState<SwapRequest[]>([
    {
      id: 1,
      from: "Alice",
      to: "You",
      message: "Swap shift on Friday?",
      isSender: false,
    },
    {
      id: 2,
      from: "You",
      to: "Bob",
      message: "Swap Saturday morning?",
      isSender: true,
    },
    {
      id: 3,
      from: "Charlie",
      to: "You",
      message: "Swap Tuesday?",
      isSender: false,
    },
  ]);

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setOpen(open);
    };

  const handleCancel = (id: number) => {
    setRequests(requests.filter((req) => req.id !== id));
  };

  const handleSwap = (id: number) => {
    alert(`Swapped request ID: ${id}`);
    setRequests(requests.filter((req) => req.id !== id));
  };

  const handleReject = (id: number) => {
    alert(`Rejected request ID: ${id}`);
    setRequests(requests.filter((req) => req.id !== id));
  };

  const list = () => (
    <Box
      sx={{ width: 400, p: 2 }}
      role="presentation"
      onKeyDown={toggleDrawer(false)}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Swap Requests</Typography>
        <IconButton onClick={toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {requests.map((req) => (
          <ListItem key={req.id} sx={{ mb: 1 }} divider>
            <ListItemText
              primary={req.message}
              secondary={req.isSender ? `To: ${req.to}` : `From: ${req.from}`}
            />
            <ListItemSecondaryAction>
              {req.isSender ? (
                <IconButton
                  edge="end"
                  color="error"
                  onClick={() => handleCancel(req.id)}
                >
                  <CancelIcon />
                </IconButton>
              ) : (
                <>
                  <IconButton
                    edge="end"
                    color="primary"
                    onClick={() => handleSwap(req.id)}
                  >
                    <SwapHorizIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleReject(req.id)}
                  >
                    <CancelIcon />
                  </IconButton>
                </>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <div>
      <Button
        variant="contained"
        className="btn-brown"
        startIcon={<SwapHorizIcon />}
        onClick={toggleDrawer(true)}
        sx={{ textTransform: "none", borderRadius: "9999px" }}
      >
        Open Swap Requests
      </Button>
      <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
        {list()}
      </Drawer>
    </div>
  );
}
