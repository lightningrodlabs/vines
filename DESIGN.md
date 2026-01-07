
## Threads ZomeViewModel

### Perspective

newThreads


## Activity & Notifications

Notification = personal

Activity = something happened in the group (for Moss) ; medium

VinesNotification -> notifyFrame() high


New Thread:
 - Any New thread (including Topic & Category) = Activity ; WAL = thread
 - New thread off of my content (fork) = Notification ; WAL =
 (- New thread is for private DM = None)

New Bead:
 - Any New bead on public thread = Activity (Notification if set to all); WAL = 
 - New bead mentions me = Notification if set; WAL =
   (- New bead is DM = Notification ; WAL =) 
 - New bead is Reply to me = Notification if set ; WAL = 

New Reaction:
 - Reaction on any Bead = None ;
 - Reaction on my Bead = None ;

New Flag:
 - Flag on my Bead = Notification ; WAL = 

New Ban:
 - Any Ban on public thread = Activity??
 - Ban on me = Notification ; WAL =


export enum NotifiableEvent {
NewBead = 'NewBead',
Mention = 'Mention',
Reply = 'Reply', // Is a reply if prevBead in Bead is different from last known bead for pp and not in a DM thread 
Fork = 'Fork',
NewDmThread = 'NewDmThread',
Flagged = "Flagged",
Banned = "Banned",
}