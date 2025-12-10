#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - MONGODB REPLICA SET INIT
# ==============================================

set -e

echo "Waiting for MongoDB instances to be ready..."
sleep 10

echo "Initializing replica set..."

mongosh --host mongo-primary:27017 -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-secondary1:27017", priority: 1 },
    { _id: 2, host: "mongo-secondary2:27017", priority: 1 }
  ]
});
EOF

echo "Waiting for replica set to initialize..."
sleep 10

echo "Checking replica set status..."
mongosh --host mongo-primary:27017 -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval "rs.status()"

echo "Creating application database and user..."
mongosh --host mongo-primary:27017 -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
use plugspace;

db.createUser({
  user: "plugspace_app",
  pwd: "$MONGO_ROOT_PASSWORD",
  roles: [
    { role: "readWrite", db: "plugspace" },
    { role: "dbAdmin", db: "plugspace" }
  ]
});

// Create indexes for optimal performance
db.users.createIndex({ "firebaseUid": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "organizationId": 1, "email": 1 });
db.users.createIndex({ "status": 1 });

db.organizations.createIndex({ "slug": 1 }, { unique: true });
db.organizations.createIndex({ "domain": 1 }, { unique: true, sparse: true });

db.projects.createIndex({ "subdomain": 1 }, { unique: true });
db.projects.createIndex({ "customDomain": 1 }, { unique: true, sparse: true });
db.projects.createIndex({ "organizationId": 1, "userId": 1 });
db.projects.createIndex({ "status": 1 });

db.interaction_logs.createIndex({ "projectId": 1, "timestamp": -1 });
db.interaction_logs.createIndex({ "userId": 1, "timestamp": -1 });
db.interaction_logs.createIndex({ "agentName": 1, "timestamp": -1 });

db.templates.createIndex({ "category": 1 });
db.templates.createIndex({ "featured": 1 });
db.templates.createIndex({ "status": 1 });

db.activity_logs.createIndex({ "userId": 1, "timestamp": -1 });
db.activity_logs.createIndex({ "organizationId": 1, "timestamp": -1 });
db.activity_logs.createIndex({ "action": 1, "timestamp": -1 });

// Create TTL indexes for cleanup
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.rate_limit_records.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print("Replica set initialization complete!");
EOF

echo "MongoDB replica set setup complete!"
