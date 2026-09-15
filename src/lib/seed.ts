// @ts-nocheck
import { db } from "@/lib/db";
import { db, seedTopicsIfEmpty, seedUsersIfEmpty, SessionAttendance } from "./db";
import { subDays, addDays, subMonths } from "date-fns";

// Helpers for random data generation
const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Rohan", "Rahul", "Aman", "Yash", "Karan", "Ishaan", "Dhruv", "Kabir", "Vivaan", "Atharv", "Pranav", "Dev", "Aryan", "Krishna", "Shivam", "Om", "Harsh", "Kunal", "Laksh", "Shreyas", "Varun", "Abhinav", "Nikhil", "Gaurav", "Sahil"];
const lastNames = ["Sharma", "Verma", "Gupta", "Patel", "Singh", "Kumar", "Mehta", "Jain", "Deshmukh", "Reddy", "Rao", "Iyer", "Nair", "Pillai", "Das", "Bose", "Chakraborty", "Yadav", "Chauhan", "Rajput"];
const colleges = ["MSU", "Polytechnic", "Parul University", "Navrachana University", "ITM Universe", "BVM", "SVNIT", "Nirma University", "LD College", "IIM"];
const branches = ["Computer Science", "Mechanical", "Civil", "Electrical", "Electronics", "IT", "Chemical", "Automobile", "Architecture", "MBA"];
const nativePlaces = ["Ahmedabad", "Surat", "Rajkot", "Vadodara", "Mumbai", "Pune", "Delhi", "Jaipur", "Indore", "Bhopal", "Lucknow", "Patna", "Kolkata", "Chennai", "Hyderabad"];
const companies = ["TCS", "Infosys", "Wipro", "Reliance", "L&T", "Adani", "HDFC", "ICICI", "Amazon", "Google"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedDemoData() {
  await seedTopicsIfEmpty();
  await seedUsersIfEmpty();

  const count = await db.people.count();
  if (count > 0) return; // Don't seed if already populated

  const now = new Date();

  // 1. Create Users and Teams
  const teamId = await firestoreAPI.add('teams', { name: "Downtown Outreach Team" });
  const adminId = await db.users.add({
    name: "Admin User",
    email: "admin@folkreach.local",
    role: "ADMIN",
    teamId: teamId as number
  });
  
  // Create 4 team members for assignments
  const memberIds = [];
  for (let i = 1; i <= 4; i++) {
    const id = await db.users.add({
      name: `Caller ${i}`,
      email: `caller${i}@folkreach.local`,
      role: "MEMBER",
      teamId: teamId as number
    });
    memberIds.push(id as number);
  }

  // 2. Generate 60 Contacts
  const peopleData = [];
  for (let i = 0; i < 60; i++) {
    const isStudent = Math.random() > 0.3; // 70% students
    const firstContactDaysAgo = randomNumber(5, 120);
    const firstContactDate = subDays(now, firstContactDaysAgo);
    
    // Simulate some recent interactions
    let lastInteractionDate = Math.random() > 0.4 ? subDays(now, randomNumber(1, firstContactDaysAgo)) : undefined;

    peopleData.push({
      name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      phone: `+91 98${randomNumber(10000000, 99999999)}`,
      college: isStudent ? randomChoice(colleges) : undefined,
      branch: isStudent ? randomChoice(branches) : undefined,
      year: isStudent ? `Year ${randomNumber(1, 4)}` : undefined,
      company: !isStudent ? randomChoice(companies) : undefined,
      nativePlace: randomChoice(nativePlaces),
      currentCity: "Vadodara",
      howMet: randomChoice(["Book Distribution", "College Session", "Reaching", "Reference", "Event", "Festival"]),
      firstContactDate,
      lastInteractionDate,
      priorityScore: randomNumber(0, 30),
      tags: [isStudent ? "Student" : "Professional", Math.random() > 0.8 ? "Hostel" : "Day Scholar"],
      assignedUserId: Math.random() > 0.2 ? randomChoice(memberIds) : (adminId as number),
      birthday: Math.random() > 0.5 ? subDays(now, randomNumber(-10, 350)) : undefined // Random birthdays
    });
  }

  const generatedPeopleIds = await db.people.bulkAdd(peopleData, { allKeys: true }) as number[];

  // 3. Create Sessions
  const pastSessionId = await db.sessions.add({
    name: "Youth Festival",
    type: "Special Session",
    date: subDays(now, 7),
    location: "Main Center",
    organizerId: adminId as number
  });

  const upcomingSessionId = await db.sessions.add({
    name: "Sunday Wisdom Talk",
    type: "Weekly Session",
    date: addDays(now, 2),
    location: "Center Hall",
    organizerId: adminId as number
  });

  // 4. Generate Session Attendance & Calling Sheet
  const attendanceData = [];
  
  // For the Upcoming Session (Calling Sheet)
  // Let's assign 40 people to be called for the upcoming session
  const callers = [adminId as number, ...memberIds];
  
  for (let i = 0; i < 40; i++) {
    const personId = generatedPeopleIds[i];
    const assignedCaller = callers[i % callers.length]; // Distribute evenly
    
    // Some have already been called, some are pending
    const statusRand = Math.random();
    let status: any = 'PENDING_CALL';
    let callOutcome = undefined;
    
    if (statusRand > 0.7) {
      status = 'CONFIRMED';
      callOutcome = "Said he will come with friends";
    } else if (statusRand > 0.5) {
      status = 'DECLINED';
      callOutcome = "Busy with exams";
    }

    attendanceData.push({
      sessionId: upcomingSessionId as number,
      personId,
      status: status as any,
      assignedUserId: assignedCaller,
      callOutcome,
      calledAt: status !== 'PENDING_CALL' ? subDays(now, randomNumber(0, 1)) : undefined,
      isNewContact: Math.random() > 0.8
    });
  }
  
  // For the Past Session (Actual Attendance)
  for (let i = 20; i < 50; i++) { // Overlap some contacts
    const personId = generatedPeopleIds[i];
    const attended = Math.random() > 0.4;
    attendanceData.push({
      sessionId: pastSessionId as number,
      personId,
      status: (attended ? 'ATTENDED' : 'MISSED') as SessionAttendance['status'],
    });
  }

  await db.sessionAttendance.bulkAdd(attendanceData);

  // 5. Create some Tasks / Follow-ups
  const tasksData = [
    { personId: generatedPeopleIds[0], assignedToUserId: randomChoice(callers), title: 'Prasadam follow-up', type: 'MEETING' as const, dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[1], assignedToUserId: randomChoice(callers), title: 'Book reading', type: 'CALL' as const, dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[2], assignedToUserId: randomChoice(callers), title: 'Discuss session', type: 'CALL' as const, dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[3], assignedToUserId: randomChoice(callers), title: 'Book reading', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[4], assignedToUserId: randomChoice(callers), title: 'Prasadam follow-up', type: 'MEETING' as const, dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[11], assignedToUserId: randomChoice(callers), title: 'Call regarding session', type: 'CALL' as const, dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[14], assignedToUserId: randomChoice(callers), title: 'Schedule One-to-One', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[19], assignedToUserId: randomChoice(callers), title: 'Book reading', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[21], assignedToUserId: randomChoice(callers), title: 'Check on chanting', type: 'CALL' as const, dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[24], assignedToUserId: randomChoice(callers), title: 'Follow-up on Book Distribution', type: 'CALL' as const, dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[27], assignedToUserId: randomChoice(callers), title: 'Invite to Sunday Feast', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[29], assignedToUserId: randomChoice(callers), title: 'Discuss volunteering', type: 'CALL' as const, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[34], assignedToUserId: randomChoice(callers), title: 'Prasadam follow-up', type: 'MEETING' as const, dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[39], assignedToUserId: randomChoice(callers), title: 'Call regarding session', type: 'CALL' as const, dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[44], assignedToUserId: randomChoice(callers), title: 'Schedule One-to-One', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[49], assignedToUserId: randomChoice(callers), title: 'Book reading', type: 'CALL' as const, dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[54], assignedToUserId: randomChoice(callers), title: 'Check on chanting', type: 'CALL' as const, dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { personId: generatedPeopleIds[59], assignedToUserId: randomChoice(callers), title: 'Invite to Sunday Feast', type: 'MEETING' as const, dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
  ];
  await db.tasks.bulkAdd(tasksData);

  // 6. Create some random past interactions for timeline
  const interactionsData = [];
  for (let i = 0; i < 50; i++) {
    const personId = randomChoice(generatedPeopleIds);
    interactionsData.push({
      personId,
      type: randomChoice(['CALL', 'MEETING', 'PRASADAM', 'BOOK', 'WHATSAPP']) as any,
      date: subDays(now, randomNumber(1, 30)),
      purpose: "General check-in",
      outcome: "Positive",
      topicsDiscussed: Math.random() > 0.5 ? [randomNumber(1, 5), randomNumber(6, 10)] : []
    });
  }
  await db.interactions.bulkAdd(interactionsData);

  // Create Notifications
  await db.notifications.add({
    userId: adminId as number,
    type: "SYSTEM",
    message: "Welcome to FOLKReach! 60 demo contacts have been generated.",
    isRead: false,
    createdAt: now
  });
}
