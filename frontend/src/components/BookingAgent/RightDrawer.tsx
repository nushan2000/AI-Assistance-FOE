import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import axios from 'axios';
import { fetchUserEmailFromProfile } from "../../services/api";
import { log } from 'console';
type SwapRequest = {
  id: number;
  from: string;
  to: string;
  message: string;
  isSender: boolean;
  requester_name?: string;
  offerer_name?: string;
  offerer_email?:string;
  requester_email?:string;
};

export default function RightDrawer() {
  const [open, setOpen] = React.useState(false);
const [email, setEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    const getEmail = async () => {
      const userEmail = await fetchUserEmailFromProfile();
      console.log("userEmail",userEmail);
      
      setEmail(userEmail);
    };
    getEmail();
   
    
  }, []);
  // Example data
  const [requests, setRequests] = React.useState<SwapRequest[]>([
  //   { id: 1, from: 'Alice', to: 'You', message: 'Swap shift on Friday?', isSender: false },
  //   { id: 2, from: 'You', to: 'Bob', message: 'Swap Saturday morning?', isSender: true },
  //   { id: 3, from: 'Charlie', to: 'You', message: 'Swap Tuesday?', isSender: false },
  // 
  ]);

  React.useEffect(() => {
    fetchSwapRequests();
  }, []);

  const fetchSwapRequests = async () => {
    const response=await axios.get(`${process.env.REACT_APP_HBA_URL}/swap/get_all_requests`);
    const filteredRequests = response.data.filter((req: SwapRequest) => req.requester_email === email || req.offerer_email === email);
    setRequests(filteredRequests);
    console.log("data",filteredRequests);
    console.log("email",email);
    
  }

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setOpen(open);
  };

  const handleCancel = (id: number) => {
    setRequests(requests.filter((req) => req.id !== id));
  };

  const handleSwap = async (id: number) => {
    try {

    alert(`Swapped request ID: ${id}`);
    const response = await axios.post(
      `${process.env.REACT_APP_HBA_URL}/swap/respond?swap_id=${id}&response=approved`
    )

    
    if (response.status === 200) {
      
        fetchSwapRequests();
        // Remove the request from the UI
        // setRequests(requests.filter((req) => req.id !== id));
        // Show success message
        alert('Swap request rejected successfully');
      }
    } catch (error) {
      console.error('Error approving swap request:', error);
      alert('Failed to approve swap request');
    }
    // setRequests(requests.filter((req) => req.id !== id));
  };

  const handleReject = async (id: number) => {
    try {
console.log("id",id);

      // Call the swap respond API with 'rejected' status
      const response = await axios.post(
  `${process.env.REACT_APP_HBA_URL}/swap/respond?swap_id=${id}&response=rejected`
);


      if (response.status === 200) {
        fetchSwapRequests();
        // Remove the request from the UI
        // setRequests(requests.filter((req) => req.id !== id));
        // Show success message
        alert('Swap request rejected successfully');
      }
    } catch (error) {
      console.error('Error rejecting swap request:', error);
      alert('Failed to reject swap request');
    }
  };

  const list = () => (
    <Box
      sx={{ width: 400, p: 2 }}
      role="presentation"
      onKeyDown={toggleDrawer(false)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
              secondary={req.requester_email===email  ? `To: ${req.offerer_name}` : `From: ${req.requester_name}`}
            />
            <ListItemSecondaryAction>
              {req.requester_email===email ? (
                <IconButton edge="end" color="error" onClick={() => handleReject(req.id)}>
                  <CancelIcon />
                </IconButton>
              ) : (
                <>
                  <IconButton edge="end" color="primary" onClick={() => handleSwap(req.id)}>
                    <SwapHorizIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleReject(req.id)}>
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
      <Button variant="contained" onClick={toggleDrawer(true)}>
        Open Swap Requests
      </Button>
      <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
        {list()}
      </Drawer>
    </div>
  );
}
