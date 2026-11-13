/* Add relations: Supplier<->Shipment, Shipment<->ShipmentItem, Part<->ShipmentItem,
   Order<->OrderItem.
   relationMode = "prisma" — relations are enforced at the Prisma client level,
   no foreign key constraints are created in the database. */
