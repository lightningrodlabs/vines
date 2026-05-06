
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

## Validation Receipts

In Holochain 0.6.1, only the author of an action can get validation receipts by calling HDK function `get_validation_receipts(action_hash)`
Vines makes use of this to show end-users the validation status of messages (beads).

The ZDK signaling system provides a Validation status when signaling an entry. It has the following states:
```
pub enum ValidatedBy {
   None,    // Untrusted, e.g. received remotely from another agent via a signal
   Me,      // I committed the action
   Peer,    // There is at least one valid validation receipt, and I also validated it
   Network, // Trusted, received from DHT (enough valid validation receipts)
}
```

The ThreadsZvm Perspective holds a `validationMap`, which stores the best known validation status for each action.
In effect, it's mainly used for Beads and ParticipationProtocols.
When attesting entries, the zome code calls `get_validation_receipts(action_hash)` to get the latest validation status, when
the local agent is the author, otherwise we assume the Entry has been validated by the Network since it has been received via gossip,
and should have been validated localy.

For real-time communications, Vines implement a signaling protocol (in ThreadsDvm) where the author will mark a self-authored Bead as Unvalidated,
and will request validation from peers online.
Upon reception of a request, the remote peer will store it and check if it has received the data via gossip and reply to the author if it has.
When an agent receives a Bead, it will check if its author is waiting for a reply by going through the stored requests.
When a reply is received, the author assumes the Bead to be Peer validated.

Until a reply has been received, the author will continue to send requests at a regular interval.

In Holochain 0.6.1, Entries have a `required_validations` field which specifies how many peers must validate the entry before it is considered valid.
It isn't actually usable for entries not self-authored, since entries will gossip even if the number of required validations is not reached. 
