"use client"
import React, { useState, useEffect, useRef } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import {
    getDatabase,
    ref,
    onValue,
    set,
    Database
  } from 'firebase/database';
import dynamic from "next/dynamic";
import * as Tone from 'tone';
import { CHORDS, getUserColor } from "@/lib/harmonyUtil";
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebase';
import FlashingStrip from '@/components/collective-harmony/flashing-strip';
import NotesTrail from '@/components/collective-harmony/notes-trail';

const CollectiveHarmony = () => {
    const [bpm, setBpm] = useState(80);
    const [chord, setChord] = useState<keyof typeof CHORDS>('C');
    const synth = useRef<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>>>(null);
    const [db, setDb] = useState<Database | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [users, setUsers] = useState<string[]>([]);
    const subscribedUsers: { [key: string]: boolean } = {};
    const [windowDimensions, setWindowDimensions] = useState({
        width: 0,
        height: 0,
    });
    const [activeNodes, setActiveNodes] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const updateDimensions = () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
    
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    useEffect(() => {
        synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
        Tone.getTransport().start();

        if (!getApps().length) {
            console.log(firebaseConfig);
            const app = initializeApp(firebaseConfig);
            setDb(getDatabase(app));
            const auth = getAuth();
            signInAnonymously(auth)
                .then(() => {
                    console.log("Signed in anonymously");
                    setIsAuthenticated(true);
                })
                .catch((error) => console.error("Error signing in:", error));
        }

        return () => {
            if (synth.current) {
                synth.current.dispose();
            }
            Tone.getTransport().stop();
        };
    }, []);

    const updateDatabase = (bpm: number, chord: string) => {
        if (db) {
            const dbRef = ref(db, 'setup');
            set(dbRef, {
                bpm: bpm,
                chord: chord
            })
            .then(() => console.log('Setup updated in database'))
            .catch((error) => console.error('Error updating setup:', error));
        }
    };

    const attackNoteAtNextQuarter = (note: string, userId: string) => {
        if (synth.current) {
            const nextQuarterTime = Tone.getTransport().nextSubdivision('4n');
            
            Tone.getTransport().schedule((time) => {
                synth.current?.triggerAttack(note, time);
                console.log(`Attacking note "${note}" at ${time}`);
                const userColor = getUserColor(userId);
                activeNodes[userColor] = note;
                setActiveNodes({ ...activeNodes });
            }, nextQuarterTime);
        }
    };

    const releaseNoteAtNextQuarter = (note: string, userId: string) => {
        if (synth.current) {
            const nextQuarterTime = Tone.getTransport().nextSubdivision('4n');
            Tone.getTransport().schedule((time) => {
                synth.current?.triggerRelease(note, time);
                console.log(`Releasing note "${note}" at ${time}`);
                const userColor = getUserColor(userId);
                activeNodes[userColor] = "";
                setActiveNodes({ ...activeNodes });
            }, nextQuarterTime);
        }
    };

    useEffect(() => {
        if (db && isAuthenticated) {
            updateDatabase(bpm, chord);

            const usersRef = ref(db, 'users');
            const unsubscribe = onValue(usersRef, (snapshot) => {
                const data = snapshot.val();
                console.log("Users updated:", data);
                if (data) {
                    const userIds = Object.keys(data);
                    setUsers(userIds);
                }
            });
            return () => unsubscribe();
        }
    }, [db, isAuthenticated]);

    useEffect(() => {
        if (!db || !isAuthenticated) return;

        for (const userId of users) {
            if (!subscribedUsers[userId]) {
                const userNoteRef = ref(db, userId);
                const unsubscribeUser = onValue(userNoteRef, (snapshot) => {
                    if (!snapshot.exists()) {
                        unsubscribeUser();
                        subscribedUsers[userId] = false;
                        console.log(`Unsubscribed from user ${userId}`);
                    } else {
                        const data = snapshot.val();
                        if (data && data.note) {
                            console.log(`Received note "${data.note}" from user ${userId}`);
                            if (data.status === "press") {
                                attackNoteAtNextQuarter(data.note, userId);
                            } else if (data.status === "release") {
                                releaseNoteAtNextQuarter(data.note, userId);
                            }
                        }
                    }
                });
                subscribedUsers[userId] = true;
            }
        }
    }, [users])

    useEffect(() => {
        updateDatabase(bpm, chord);
        Tone.getTransport().bpm.value = bpm;
    }, [bpm, chord]);



    return (
        <div className="relative w-screen h-screen bg-gray-950 text-white flex items-center justify-center overflow-hidden">
            
            <FlashingStrip bpm={bpm}/>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <NotesTrail
                    notes={CHORDS[chord]}
                    windowWidth={windowDimensions.width}
                    windowHeight={496}
                    activeNodes={activeNodes}
                />
            </div>

            {/* Chord nodes on left */}
            <div className="absolute left-8 flex flex-col space-y-4">
                {CHORDS[chord].map(note => (
                    <div key={note} className="relative w-full h-12 bg-gray-800 rounded">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white">{note}</span>
                    </div>
                ))}
            </div>

            {/* Controls top-right */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2 bg-gray-800 bg-opacity-50 p-4 rounded">
                <label className="flex items-center space-x-2">
                    <span className="text-sm">Players:</span>
                    <span className="text-sm">{users.length}</span>
                </label>
                <label className="flex items-center space-x-2">
                    <span className="text-sm">BPM:</span>
                    <input
                        type="number" min="30" max="300"
                        value={bpm}
                        onChange={e => setBpm(+e.target.value)}
                        className="w-16 p-1 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    />
                </label>
                <label className="flex items-center space-x-2">
                    <span className="text-sm">Chord:</span>
                    <select
                        value={chord}
                        onChange={e => setChord(e.target.value as keyof typeof CHORDS)}
                        className="p-1 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        {Object.keys(CHORDS).map(c => (
                        <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
        )
}

export default dynamic(() => Promise.resolve(CollectiveHarmony), { ssr: false });