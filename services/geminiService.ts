import { GoogleGenAI } from "@google/genai";
import { Place, BookingDetails } from "../types";

const apiKey = process.env.API_KEY || ''; 
export const ai = new GoogleGenAI({ apiKey });

// --- USER SESSION CONFIGURATION ---

export const getUserSystemInstruction = (lastBookingStatus?: string, userContext?: string) => `
You are Sola, a personal assistant for the USER. 
You speak in a friendly mix of English and Tamil (Chennai style).

YOUR GOAL:
1. Help the user book services across ANY category (Healthcare, Salons, Restaurants, Vehicle Service, Banks, educational, home services, etc.).
2. Search for options using 'findPlaces' (which automatically filters out disliked businesses).
3. Select a specific place using 'selectProvider'.
4. CRITICAL: Before booking, you MUST collect: Service Type, Date, and Time.
   - If booking a Restaurant, you MUST ALSO collect: Number of guests.
   - If booking a Hospital, check if there are symptoms/reasons.
   - If booking a Vehicle Service, ask for vehicle details (number/model) if not known.
5. Once you have ALL details, call the 'initiateCall' tool to start the receptionist call.

CONTEXT:
${lastBookingStatus ? `The previous booking call status was: ${lastBookingStatus}. Inform the user about this result.` : ''}

${userContext ? `ACTIVE USER DETAILS & PREFERENCES CONTEXT (Use this to pre-fill/remember information without asking again):
${userContext}` : ''}

RULES:
- Always check if the active profile already has the requested metadata (like vehicle details or weight). If yes, DO NOT ask the user for it again; automatically use it.
- If the user asks to send an email invitation, confirm their email address.
- Speak naturally and colloquially.
- Do NOT pretend to make the call yourself in *this* session. You must use the 'initiateCall' tool to switch to the phone mode.
`;

export const userTools = [
  {
    functionDeclarations: [
      {
        name: "findPlaces",
        description: "Search for nearby places like saloons, doctors, etc.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "The search query (e.g., 'saloon nearby')" }
          },
          required: ["query"]
        }
      },
      {
        name: "selectProvider",
        description: "Select a specific provider from the map list.",
        parameters: {
          type: "OBJECT",
          properties: {
            providerId: { type: "STRING", description: "The ID of the selected provider" }
          },
          required: ["providerId"]
        }
      },
      {
        name: "initiateCall",
        description: "Switch to the calling session to contact the receptionist.",
        parameters: {
          type: "OBJECT",
          properties: {
            placeId: { type: "STRING" },
            service: { type: "STRING" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: { type: "STRING", description: "HH:MM format" },
            guests: { type: "STRING", description: "Number of guests/people (only for restaurant bookings)" }
          },
          required: ["placeId", "service", "date", "time"]
        }
      }
    ]
  }
];

// --- RECEPTIONIST SESSION CONFIGURATION ---

export const getReceptionistSystemInstruction = (details: BookingDetails, userContext?: string) => `
You are Sola. You have just dialed the number for "${details.placeName}".
The connection is established. The person on the other end is the RECEPTIONIST (User roleplay).

YOUR TASK:
1. Start speaking IMMEDIATELY. Do NOT wait for them to say hello.
2. Say: "Vanakkam, is this ${details.placeName}?"
3. Ask to book:
   - For restaurant: Book a table for ${details.guests || 'some'} people for "${details.service}" on ${details.date} at ${details.time}.
   - For healthcare: Book a slot for "${details.service}" on ${details.date} at ${details.time} for the patient.
   - For vehicle service: Book a service slot for "${details.service}" on ${details.date} at ${details.time}.
   - Otherwise: Book a slot for "${details.service}" on ${details.date} at ${details.time}.
4. Be polite but persistent. If the timeslot is unavailable, ask for alternative times.
5. When the receptionist confirms the slot, make sure to collect details (like Token Number, Reservation Code, Stylist/Doctor Name, required documents, etc.) and save them using the 'reportBookingOutcome' tool.

${userContext ? `USER & PROFILE PROFILE CONTEXT (Refer to patient/vehicle details if the receptionist asks for it):
${userContext}` : ''}

CRITICAL:
- You are making the phone call. YOU SPEAK FIRST.
- Speak in natural, polite colloquial Tamil appropriate for a telephone appointment request.
- Treat the other person as the "Sir/Madam" at the reception desk.
`;

export const receptionistTools = [
  {
    functionDeclarations: [
      {
        name: "reportBookingOutcome",
        description: "Report the final result of the phone call.",
        parameters: {
          type: "OBJECT",
          properties: {
            success: { type: "BOOLEAN" },
            finalDate: { type: "STRING" },
            finalTime: { type: "STRING" },
            notes: { type: "STRING", description: "Any notes from the receptionist" },
            tokenNumber: { type: "STRING", description: "Any token number provided by receptionist" },
            reservationCode: { type: "STRING", description: "Any booking/reservation code or confirmation ID" },
            doctorName: { type: "STRING", description: "The doctor name allocated for the booking" },
            stylistName: { type: "STRING", description: "The hair stylist name allocated" },
            serviceAdvisor: { type: "STRING", description: "The service advisor name allocated (vehicle service)" },
            tableNumber: { type: "STRING", description: "Table number allocated (restaurant)" },
            waitingTime: { type: "STRING", description: "Expected waiting time in minutes/hours" },
            consultationFee: { type: "STRING", description: "Consultation or booking fee details" },
            roomNumber: { type: "STRING", description: "Room number or cabin number" },
            counterNumber: { type: "STRING", description: "Counter number" },
            requiredDocuments: { type: "STRING", description: "Any documents requested to bring (ID card, prescription, etc.)" }
          },
          required: ["success"]
        }
      }
    ]
  }
];


// --- UTILITIES ---

// Default places (fallback when API is unavailable)
const DEFAULT_PLACES: Place[] = [
  { id: '1', name: 'Chennai Classic Saloon', address: '12, Anna Salai, Chennai', phoneNumber: '+91 98765 43210', rating: 4.5, userRatingCount: 120, location: { lat: 13.0827, lng: 80.2707 } },
  { id: '2', name: 'Velachery Spa & Saloon', address: '45, Bypass Rd, Velachery', phoneNumber: '044 2244 6688', rating: 4.2, userRatingCount: 85, location: { lat: 12.9815, lng: 80.2180 } },
  { id: '3', name: 'Style Cuts', address: '8, T Nagar, Chennai', phoneNumber: '+91 91234 56789', rating: 4.8, userRatingCount: 340, location: { lat: 13.0418, lng: 80.2341 } },
  { id: '4', name: 'Green Trends', address: 'Mylapore, Chennai', phoneNumber: '044 2468 1357', rating: 4.3, userRatingCount: 210, location: { lat: 13.0368, lng: 80.2676 } },
  { id: '5', name: 'Naturals', address: 'Adyar, Chennai', phoneNumber: '+91 99887 76655', rating: 4.6, userRatingCount: 190, location: { lat: 13.0012, lng: 80.2565 } },
];

import { searchPlacesSmart, fetchPlacesFromGeoapify } from "./geoapifyService";

export const searchPlacesWithGrounding = async (query: string, userLocation?: {lat: number, lng: number}): Promise<Place[]> => {
  try {
    const res = await searchPlacesSmart(query, userLocation);
    return res.places;
  } catch (error) {
    console.error("Error searching places:", error);
    return fetchPlacesFromGeoapify(query, userLocation);
  }
};
