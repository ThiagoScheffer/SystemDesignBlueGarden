# Design a File Upload Service Like Google Drive

## Challenge Summary

Design a service where users can:

* Upload files
* Download files
* View their files
* Store file metadata
* Control access to files

The main design lesson is separating file metadata from file contents and avoiding unnecessary transfer through application servers.

---

# Core Architecture

```text
Client
   |
   v
API Service
   |
   +----> Metadata Database
   |
   +----> Object Storage
```

For efficient uploads and downloads, the client communicates directly with object storage using temporary signed URLs.

```text
Client
   |
   +----> API Service
   |          |
   |          +----> Metadata Database
   |          +----> Generate signed URL
   |
   +----------------> Object Storage
```

---

# Required Components

## API Service

Responsibilities:

* Authenticate users
* Authorize file access
* Create upload sessions
* Generate signed upload URLs
* Generate signed download URLs
* Store and retrieve metadata
* Confirm upload completion

Configuration:

* Request capacity
* Processing latency
* Signed URL lifetime
* Maximum file size
* Failure state

---

## Metadata Database

Stores information about files, not the file bytes.

Example metadata:

```ts
interface FileMetadata {
  id: string;
  ownerId: string;
  objectKey: string;

  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;

  status:
    | 'pending'
    | 'uploaded'
    | 'processing'
    | 'available'
    | 'failed'
    | 'deleted';

  createdAt: string;
}
```

The database supports queries such as:

* List files owned by a user
* Find a file by ID
* Check who can access a file
* Display filename and size
* Track upload status

A relational database such as PostgreSQL is suitable because metadata is structured and requires ownership and access relationships.

---

## Object Storage

Stores the actual file contents.

Suitable content includes:

* Documents
* Images
* Videos
* Archives
* Backups

Configuration:

* Storage capacity
* Upload throughput
* Download throughput
* Availability
* Object size limit
* Failure state

Object storage is preferable to storing large files directly in a relational database because it scales storage and transfer independently from metadata queries.

---

# Upload Flow

## Step 1: Request an Upload

The client sends file metadata to the API.

```http
POST /files/uploads
```

```json
{
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 5242880
}
```

The API:

1. Authenticates the user.
2. Validates file size and type.
3. Creates a pending metadata record.
4. Generates a unique object key.
5. Generates a short-lived signed upload URL.

---

## Step 2: Direct Upload

The API returns:

```json
{
  "fileId": "file-123",
  "uploadUrl": "<temporary-signed-url>",
  "expiresInSeconds": 900
}
```

The client uploads directly to object storage.

```text
Client ----------------> Object Storage
          file bytes
```

The file does not pass through the application server.

Benefits:

* Lower API-server bandwidth
* Lower server CPU usage
* Better support for large files
* Independent upload scaling
* Reduced application-server cost

---

## Step 3: Confirm Completion

After the upload completes, the system marks the file as available.

Possible methods:

* Client calls a completion endpoint
* Object storage emits an upload-completed event
* A background worker verifies the object

```http
POST /files/file-123/complete
```

The service should verify:

* Object exists
* Size matches
* Checksum matches, when available
* Upload belongs to the correct user

The metadata state becomes:

```text
pending → uploaded → available
```

---

# Download Flow

1. Client requests a file download.
2. API loads file metadata.
3. API checks access permissions.
4. API generates a short-lived signed download URL.
5. Client downloads directly from object storage.

```text
Client
   |
   v
API Service
   |
   +----> Metadata Database
   |
   v
Signed download URL
   |
   v
Client ----------------> Object Storage
```

Example:

```http
GET /files/file-123/download
```

Response:

```json
{
  "downloadUrl": "<temporary-signed-url>",
  "expiresInSeconds": 300
}
```

---

# Why Use Signed URLs?

Signed URLs allow temporary access to one specific storage operation.

They can restrict:

* Object key
* Upload or download operation
* Expiration time
* Content type
* Maximum upload size
* Required headers

Advantages:

* Files bypass application servers
* Storage access remains temporary
* Users do not receive permanent storage credentials
* Access can be scoped to one object

Signed URLs should expire quickly.

---

# Important Security Rules

The service should never trust a client-provided storage key without validation.

The API should generate object keys such as:

```text
users/{userId}/files/{fileId}
```

The signed URL must be issued only after checking:

* User identity
* Ownership
* Permissions
* Storage quota
* File size
* Allowed content type

For downloads, the API must authorize the request before generating the URL.

A signed URL is a temporary bearer credential. Anyone who obtains it may use it until it expires.

---

# File Status Model

```text
PENDING
   |
   v
UPLOADED
   |
   v
PROCESSING
   |
   +----> AVAILABLE
   |
   +----> FAILED
```

Possible status meanings:

* `pending`: upload URL created
* `uploaded`: object received
* `processing`: virus scan or media processing running
* `available`: file can be downloaded
* `failed`: validation or processing failed
* `deleted`: file is no longer available

---

# Large File Uploads

Large files should use multipart or resumable uploads.

```text
Large File
   |
   +----> Part 1
   +----> Part 2
   +----> Part 3
   +----> Part 4
```

Advantages:

* Failed parts can be retried
* Uploads can resume
* Parts can upload in parallel
* Large files do not restart from zero

Required configuration:

* Part size
* Maximum parallel parts
* Upload expiration
* Retry limit

For the initial simulator, multipart upload can be optional.

---

# Required Simulator Metrics

Display:

* Upload request rate
* Upload throughput
* Download throughput
* API-server bandwidth
* Object-storage bandwidth
* Upload latency
* Download latency
* Failed uploads
* Pending uploads
* Expired upload sessions
* Storage usage
* Metadata database load

The simulator should make the difference visible between:

```text
Upload through API server
```

and:

```text
Direct upload using signed URL
```

---

# Simulation Scenarios

## Scenario 1: Upload Through API Server

All file bytes pass through the API service.

Expected behavior:

* API bandwidth rises
* API instances become bottlenecks
* Large uploads consume connections for longer periods

---

## Scenario 2: Direct Upload

Enable signed upload URLs.

Expected behavior:

* API bandwidth drops
* Object-storage bandwidth increases
* API handles only control requests

---

## Scenario 3: Expired Upload URL

The user starts uploading after the signed URL expires.

Expected behavior:

* Object storage rejects the upload
* Client requests a new upload URL

---

## Scenario 4: Interrupted Large Upload

A large upload fails partway through.

Compare:

* Single-request upload
* Multipart resumable upload

Expected behavior:

* Single upload restarts
* Multipart upload retries only failed parts

---

## Scenario 5: Unauthorized Download

A user requests another user's private file.

Expected behavior:

* API rejects the request
* No signed download URL is generated

---

## Scenario 6: Abandoned Upload

An upload URL is generated, but no file is uploaded.

Expected behavior:

* Metadata remains pending temporarily
* Cleanup removes expired upload sessions

---

## Scenario 7: Object Storage Failure

Object storage becomes unavailable.

Expected behavior:

* Metadata operations may continue
* Uploads and downloads fail or retry
* File contents remain unavailable until recovery

---

# Interview Questions

* Why separate file metadata from file contents?
* Why not store large files directly in PostgreSQL?
* Why avoid sending file bytes through the API server?
* How do signed URLs work?
* How do you authorize downloads?
* How do you confirm an upload completed?
* What happens when an upload URL expires?
* How would you support large resumable uploads?
* How do you clean up abandoned uploads?
* How do you verify file integrity?

---

# Evaluation Criteria

The candidate should understand:

* Metadata belongs in a queryable database.
* File contents belong in object storage.
* Direct uploads reduce API-server bandwidth.
* Signed URLs provide temporary scoped access.
* Upload completion must be verified.
* Downloads require authorization before URL generation.
* Large files benefit from multipart uploads.
* Pending and abandoned uploads require cleanup.
* Object storage is not a replacement for metadata and permissions.

---

# Common Weaknesses

* Storing all file bytes in a relational database
* Passing every upload through the API server
* Issuing permanent public object URLs
* Trusting client-generated object keys
* Marking files available before verifying upload completion
* Generating download URLs without authorization
* Ignoring abandoned uploads
* Ignoring file-size limits
* Ignoring resumable uploads
* Treating signed URLs as safe after unlimited expiration

---

# Recommended Teaching Model

Use:

* One client
* One API service
* One metadata database
* One object-storage component
* Optional upload worker
* Configurable signed URL expiration
* Optional multipart upload

Allow the user to:

1. Upload a file through the API server.
2. Observe API bandwidth and latency.
3. Enable direct upload with a signed URL.
4. Compare infrastructure load.
5. Expire an upload URL.
6. Interrupt a large upload.
7. Enable multipart upload.
8. Attempt an unauthorized download.

The central lesson is:

```text
Database → stores file metadata and permissions
Object storage → stores file contents
Signed URLs → allow direct temporary upload and download
```
