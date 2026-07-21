# Design an Object Storage System Like S3

## Challenge Summary

Design a distributed object storage system where users can:

* Upload objects
* Download objects
* Delete objects
* Store object metadata
* Control access
* Continue operating when storage nodes fail

The main concepts are metadata separation, object placement, replication, quorum writes, node failure, and replica repair.

---

# Core Architecture

```text
Client
   |
   v
Load Balancer
   |
   v
API Servers
   |
   +------> Metadata Database
   |
   +------> Storage Nodes
   |
   +------> Repair Worker
```

## Required Components

### Load Balancer

Distributes upload and download requests across API servers.

Important properties:

* Request throughput
* Health checks
* Failure behavior

### API Server

Handles:

* Authentication
* Upload requests
* Download requests
* Metadata lookup
* Storage-node selection
* Access-control validation

The implementation language is not important to the system design. Go, Java, Node.js, or another backend language could be used.

### Metadata Database

Stores information about each object:

* Object ID
* Bucket ID
* Owner
* Object name
* Size
* Content type
* Checksum
* Access permissions
* Replica locations
* Creation time
* Version
* Status

Example:

```ts
interface ObjectMetadata {
  objectId: string;
  bucketId: string;
  ownerId: string;
  objectKey: string;
  sizeBytes: number;
  checksum: string;
  replicaNodeIds: string[];
  status: 'uploading' | 'available' | 'deleted';
}
```

### Storage Nodes

Store the actual object bytes.

Each node should have configurable properties:

* Storage capacity
* Used capacity
* Read throughput
* Write throughput
* Network bandwidth
* Failure state
* Stored objects

Large object contents should be stored on storage nodes rather than directly in the metadata database.

### Repair Worker

Monitors storage health and restores missing replicas.

Responsibilities:

* Detect failed storage nodes
* Identify under-replicated objects
* Select healthy replacement nodes
* Copy object replicas
* Update metadata
* Verify checksums

---

# Upload Flow

1. Client sends an upload request.
2. The load balancer selects an API server.
3. The API server creates an object ID.
4. The placement strategy selects storage nodes.
5. The object is written to multiple nodes.
6. The system waits for the required number of successful writes.
7. Metadata is marked as available.
8. The client receives a successful response.

Example configuration:

```text
Replication factor: 3
Required successful writes: 2
```

The upload succeeds after two replicas acknowledge the write. The remaining replica may complete asynchronously.

---

# Download Flow

1. Client requests an object.
2. The API server loads the object metadata.
3. Access permissions are checked.
4. The API server selects a healthy replica.
5. The object is read from the storage node.
6. The checksum may be validated.
7. The object is returned to the client.

If the selected replica fails, the API server should retry another healthy replica.

---

# Metadata and Object Data

The system separates metadata from object contents.

## Metadata Database

Best suited for:

* Ownership
* Permissions
* Object names
* Checksums
* Replica locations
* Object versions
* Transactional state

## Storage Nodes

Best suited for:

* Large files
* Images
* Videos
* Archives
* Backups
* Documents

This separation allows metadata queries to remain fast while storage capacity scales independently.

---

# Object Placement

A simple design can use consistent hashing.

```text
Hash object ID
      |
      v
Place hash on ring
      |
      v
Select next available storage nodes
```

Consistent hashing reduces the amount of data that must move when storage nodes are added or removed.

However, replication placement should avoid selecting nodes that share the same failure domain.

For example, replicas should ideally be distributed across:

* Different disks
* Different machines
* Different racks
* Different availability zones

For the simulator, each storage node can have a `failureDomain` property.

```ts
interface StorageNode {
  id: string;
  capacityBytes: number;
  usedBytes: number;
  failureDomain: string;
  status: 'healthy' | 'failed' | 'recovering';
}
```

---

# Replication

Each object is stored on multiple storage nodes.

Example:

```text
Object A
  ├── Storage Node 2
  ├── Storage Node 7
  └── Storage Node 11
```

A replication factor of three means the system targets three copies of each object.

Replication provides:

* Fault tolerance
* Higher read availability
* Recovery after node failure

It also increases:

* Storage cost
* Network traffic
* Repair workload

---

# Write Quorum

The system may acknowledge an upload before every replica completes.

Example:

```text
Replication factor: 3
Write quorum: 2
```

The request succeeds after two nodes confirm the write.

Trade-off:

* A lower quorum reduces upload latency.
* A higher quorum reduces the chance that acknowledged data becomes unavailable.

The simulator should allow users to configure:

* Replication factor
* Required write acknowledgements
* Write timeout

---

# Node Failure and Repair

When a storage node fails:

1. The health monitor marks the node as unavailable.
2. Reads are sent to other replicas.
3. The repair worker finds objects stored on the failed node.
4. For each under-replicated object, it selects a healthy node.
5. An existing replica is copied to the new node.
6. The metadata is updated.
7. The object returns to the target replication factor.

Example:

```text
Before failure:
Object A → Node 1, Node 2, Node 3

Node 2 fails

Temporary state:
Object A → Node 1, Node 3

After repair:
Object A → Node 1, Node 3, Node 6
```

---

# Important Simulation Metrics

The simulator should display:

* Upload throughput
* Download throughput
* Upload latency
* Download latency
* Storage utilization
* Healthy storage nodes
* Failed storage nodes
* Under-replicated objects
* Repair queue size
* Repair bandwidth
* Replication completion time
* Failed uploads
* Failed downloads
* Estimated storage cost

---

# Required Configuration

## API Server

* Instance count
* Request capacity
* Processing latency
* Timeout
* Failure probability

## Metadata Database

* Read capacity
* Write capacity
* Storage capacity
* Replication
* Failover time

## Storage Node

* Capacity
* Read throughput
* Write throughput
* Network bandwidth
* Failure state
* Failure domain

## Placement Strategy

* Consistent hashing enabled
* Number of virtual nodes
* Replication factor
* Failure-domain awareness

## Repair Worker

* Worker count
* Repair throughput
* Maximum concurrent repairs
* Repair priority

---

# Failure Scenarios

## Scenario 1: Storage node failure

One storage node fails.

Expected behavior:

* Reads continue from other replicas.
* Objects become temporarily under-replicated.
* Repair work begins.
* Replication returns to the configured target.

## Scenario 2: Multiple node failures

Two nodes containing replicas of the same object fail.

Evaluate whether:

* The object remains readable
* The write quorum was sufficient
* Replica placement used separate failure domains

## Scenario 3: Repair backlog

Several nodes fail at once.

Expected effects:

* Large repair queue
* Increased network usage
* Longer periods of reduced durability
* Possible impact on normal reads and writes

## Scenario 4: Metadata database failure

The object data still exists, but replica locations cannot be retrieved.

Expected behavior depends on database replication and failover configuration.

## Scenario 5: Storage capacity imbalance

One storage node becomes nearly full while others have free capacity.

Evaluate:

* Placement strategy
* Virtual-node distribution
* Rebalancing
* Capacity-aware placement

## Scenario 6: Corrupted replica

A stored object fails checksum validation.

Expected behavior:

* Read another replica
* Mark the corrupted copy unhealthy
* Replace it through repair

---

# Interviewer Follow-Up Questions

* Why separate metadata from object data?
* Why not store large files in PostgreSQL?
* How are storage nodes selected?
* What happens when nodes are added?
* What happens when nodes are removed?
* Why use replication?
* When should an upload be acknowledged?
* What happens if only one replica is written?
* How are failed replicas repaired?
* How do you detect object corruption?
* How do you avoid placing every replica in the same rack?
* What happens if the metadata database is unavailable?

---

# Evaluation Criteria

## Architecture

The candidate should identify:

* Load balancer
* API layer
* Metadata database
* Storage nodes
* Health monitoring
* Repair workers

## Data separation

The candidate should explain why:

* Metadata belongs in a database
* Large object contents belong on storage nodes

## Placement

The candidate should discuss:

* Object-to-node mapping
* Adding and removing nodes
* Capacity distribution
* Failure domains

## Reliability

The candidate should address:

* Replication
* Write acknowledgements
* Read fallback
* Node failure
* Replica repair
* Corruption detection

## Trade-offs

The candidate should recognize:

* Replication increases durability but costs more storage
* Lower write quorums reduce latency but weaken durability
* Repair traffic competes with normal traffic
* Metadata availability is required to locate objects

---

# Common Weaknesses

* Storing every object directly in the relational database
* Storing only one copy of each object
* Acknowledging an upload before the minimum required replicas complete
* Ignoring storage-node failure
* Ignoring metadata-database failure
* Using consistent hashing without considering node capacity
* Placing all replicas in the same failure domain
* Repairing replicas without bandwidth limits
* Omitting checksum validation
* Assuming replication alone replaces backups or versioning

---

# Recommended Initial Design

Use:

* A load balancer
* Multiple API servers
* A relational metadata database
* Multiple storage nodes
* Consistent hashing for basic object placement
* Three replicas per object
* Two required write acknowledgements
* Health monitoring
* A repair worker
* Checksum verification

This is sufficient to teach and simulate the main object-storage concepts without modeling every feature of a production system like Amazon S3.
