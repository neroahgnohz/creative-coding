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
import { CHORDS, noteToFrequency } from "@/lib/harmonyUtil";
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebase';

const CollectiveHarmony = () => {
    const [bpm, setBpm] = useState(80);
    const [chord, setChord] = useState<keyof typeof CHORDS>('C');
    const [isPulse, setIsPulse] = useState(false);
    const synth = useRef<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>>>(null);
    const [db, setDb] = useState<Database | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [users, setUsers] = useState<Record<string, string>>({});

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
                })
                .catch((error) => console.error("Error signing in:", error));
        }
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

    const playNoteAtNextQuarter = (note: string) => {
        if (synth.current) {
            const nextQuarterTime = Tone.getTransport().nextSubdivision('4n'); // Get the next quarter note time
            Tone.getTransport().schedule((time) => {
                if (synth.current) {
                    synth.current.triggerAttackRelease(note, '4n', time);
                    console.log(`Playing note "${note}" at ${time}`);
                }
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
                    // Save users as a dictionary { <uuid>: <note> }
                    const usersDict: Record<string, string> = {};
                    Object.entries(data).forEach(([uuid, userData]) => {
                        if (typeof userData === 'object' && userData !== null && 'nextNote' in userData) {
                            const note = typeof userData.nextNote === 'object' && userData.nextNote !== null && 'note' in userData.nextNote
                                ? (userData.nextNote as { note: string }).note
                                : " ";
                            usersDict[uuid] = note;
                            if (note != " ") {
                                const frequency = noteToFrequency(note, 4);
                                playNoteAtNextQuarter(frequency);
                            }
                        } else {
                            usersDict[uuid] = "";
                        }
                    });
                    console.log("Users dictionary:", usersDict);
                    setUsers(usersDict);
                } else {
                    setUsers({});
                }
            });
            return () => unsubscribe();
        }
    }, [db, isAuthenticated]);

    useEffect(() => {
        updateDatabase(bpm, chord);
        synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
        Tone.getTransport().bpm.value = bpm;
        Tone.getTransport().start();

        const id = Tone.getTransport().scheduleRepeat(_ => {
            setIsPulse(true);
            setTimeout(() => setIsPulse(false), 100);
        }, '4n')

        return () => {
            Tone.getTransport().clear(id);
            Tone.getTransport().stop();
        }
    }, [bpm, chord]);

    useEffect(() => {
        Tone.getTransport().bpm.rampTo(bpm, 0.1);
    }, [bpm]);

    return (
        <div className="relative w-screen h-screen bg-gray-950 text-white flex items-center justify-center overflow-hidden">
            {/* Pulse Area */}
            <div
                className={
                    `absolute left-[25%] top-0 w-20 h-full transition-transform duration-100 ease-out ` +
                    (isPulse ? 'opacity-80' : 'opacity-50')
                }
                style={{
                    background: 'linear-gradient(to right, rgba(82, 82, 82, 1) 10%, rgba(82, 82, 82, 0.5) 50%, rgba(82, 82, 82, 0) 100%)',
                }}
            >
                {/* <div className="absolute left-0 top-0 w-[1px] h-full bg-white bg-opacity-70 transform -translate-x-1/2" /> */}
            </div>

            {/* Chord nodes on left */}
            <div className="absolute left-8 flex flex-col space-y-4">
                {CHORDS[chord].map(note => (
                <div key={note}
                    className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                    {note}
                </div>
                ))}
            </div>

            {/* Controls top-right */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2 bg-gray-800 bg-opacity-50 p-4 rounded">
                <label className="flex items-center space-x-2">
                    <span className="text-sm">Players:</span>
                    <span className="text-sm">{Object.keys(users).length}</span>
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