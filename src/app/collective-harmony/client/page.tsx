"use client"
import { firebaseConfig } from "@/config/firebase";
import { CHORDS } from "@/lib/harmonyUtil";
import { on } from "events";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { Database, getDatabase, onDisconnect, onValue, ref, set } from "firebase/database";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';


const CollectiveHarmonyClient = () => {
    const [bpm, setBpm] = useState(80);
    const [chord, setChord] = useState<keyof typeof CHORDS>('C');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [db, setDb] = useState<Database | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!getApps().length) {
            console.log(firebaseConfig);
            const app = initializeApp(firebaseConfig);
            setDb(getDatabase(app));
            const auth = getAuth();
            signInAnonymously(auth)
                .then(() => {
                    console.log("Signed in anonymously");
                    setIsAuthenticated(true);

                    const generatedUserId = uuidv4();
                    setUserId(generatedUserId);
                })
                .catch((error) => console.error("Error signing in:", error));
        }
    }, []);

    useEffect(() => {
        if (db && isAuthenticated && userId) {
            const setupRef = ref(db, 'setup');
            const unsubscribe = onValue(setupRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                console.log("Setup changed:", data);
                if (data.bpm) setBpm(data.bpm);
                if (data.chord) setChord(data.chord);
                }
            });
    
            const userRef = ref(db, `users/${userId}`);
            set(userRef, { joinedAt: Date.now() })
                    .then(() => console.log(`User ${userId} added to database`))
                    .catch((error) => console.error("Error adding user to database:", error));

            const userDataRef = ref(db, `${userId}`);
            set(userDataRef, { note: "" })
                .then(() => console.log(`User ${userId} data initialized`))
                .catch((error) => console.error("Error initializing user data:", error));

            onDisconnect(userRef)
                .remove()
                .then(() => console.log(`onDisconnect set for user ${userId}`))
                .catch((error) => console.error("Error setting onDisconnect:", error));

            onDisconnect(userDataRef)
                .remove()
                .then(() => console.log(`onDisconnect set for user ${userId} data`))
                .catch((error) => console.error("Error setting onDisconnect for user data:", error));
          return () => unsubscribe();
        }
    }, [db, isAuthenticated, userId]);

    const SendNote = (note: string, status: string) => {
        if (db && userId) {
            console.log(`Sending note "${note}" with status "${status}" to user ${userId}`);
            const userNoteRef = ref(db, `${userId}`);
            set(userNoteRef, { note, sentAt: Date.now(), status})
                .then(() => console.log(`Note "${note}" sent to user ${userId}`))
                .catch((error) => console.error("Error sending note:", error));
        } else {
            console.error("Database or userId is not initialized");
        }
    }
    
    return (
        <div className="w-screen h-screen bg-gray-950 text-white flex items-center justify-center gap-4">
            {CHORDS[chord].map((note) => (
                <button
                    key={note}
                    className="w-20 h-20 bg-gray-700 rounded-full text-white font-semibold text-lg flex items-center justify-center hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onMouseDown={(event) => {
                        event.preventDefault();
                        SendNote(note, "press");
                    }}
                    onMouseUp={(event) => {
                        event.preventDefault();
                        SendNote(note, "release");
                    }}
                >
                    {note}
                </button>
            ))}

            {/* Controls top-right */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2 bg-gray-800 bg-opacity-50 p-4 rounded">
                <label className="flex items-center space-x-2">
                    <span className="text-sm">BPM:</span>
                    <span className="text-sm">{bpm}</span>
                </label>
                <label className="flex items-center space-x-2">
                    <span className="text-sm">Chord:</span>
                    <span className="text-sm">{chord}</span>
                </label>
            </div>
        </div>
    );
}

export default dynamic(() => Promise.resolve(CollectiveHarmonyClient), { ssr: false });