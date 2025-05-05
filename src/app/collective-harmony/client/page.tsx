"use client"
import { firebaseConfig } from "@/config/firebase";
import { CHORDS } from "@/lib/harmonyUtil";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { Database, getDatabase, onDisconnect, onValue, ref, set } from "firebase/database";
import dynamic from "next/dynamic";
import { use, useEffect, useState } from "react";
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

            onDisconnect(userRef)
                .remove()
                .then(() => console.log(`onDisconnect set for user ${userId}`))
                .catch((error) => console.error("Error setting onDisconnect:", error));
          return () => unsubscribe();
        }
    }, [db, isAuthenticated, userId]);

    var SendNote = (note: string) => {
        if (db && userId) {
            const userNoteRef = ref(db, `users/${userId}/nextNote`);
            set(userNoteRef, { note, sentAt: Date.now() })
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
                    onClick={() => SendNote(note)}
                    // onTouchStart={() => SendNote(note)}
                >
                    {note}
                </button>
            ))}
        </div>
    );
}

export default dynamic(() => Promise.resolve(CollectiveHarmonyClient), { ssr: false });