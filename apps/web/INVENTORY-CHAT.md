# QuickBooks Desktop Inventory Chat

AI-powered chat interface for managing QuickBooks Desktop inventory items using natural language.

## Overview

This feature provides a conversational interface to perform CRUD operations on QuickBooks Desktop inventory items. Users can manage inventory by typing natural language commands like:

- "Create a new item called Widget with price $50"
- "Update Widget price to $75"
- "Show me all active items"
- "List items containing 'Kitchen'"

The system uses OpenAI GPT-4 to parse natural language into structured operations and execute them via the Conductor API.

## Architecture

### Backend Services

**1. Inventory Service** (`lib/quickbooks/inventory.service.ts`)
- CRUD operations for inventory items
- Wraps Conductor SDK API calls
- Includes logging and error handling

**2. OpenAI Service** (`lib/quickbooks/openai.service.ts`)
- Parses natural language commands
- Extracts structured data (operation type, item details, filters)
- Generates user-friendly response messages
- Uses structured outputs with Zod schemas

**3. Server Actions** (`app/home/[account]/inventory-chat/_lib/server/server-actions.ts`)
- `processChatMessage`: Main action that handles chat messages
- Orchestrates OpenAI parsing and inventory operations
- Handles complex scenarios (searching by name, multiple matches, etc.)

### Frontend Components

**1. Chat Container** (`_components/inventory-chat-container.tsx`)
- Main chat interface
- Manages message state and history
- Handles loading states and error display

**2. Chat Message** (`_components/chat-message.tsx`)
- Individual message display
- Shows user/assistant messages with icons
- Displays success/failure indicators
- Timestamps

**3. Chat Input Form** (`_components/chat-input-form.tsx`)
- Message input with react-hook-form
- Send button and keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Loading state handling

### Pages

**Personal Account Page** (`app/home/(user)/inventory-chat/page.tsx`)
- Route: `/home/inventory-chat`
- Personal account context (default)
- Full-height chat interface
- Accessible from home page sidebar

**Team Account Page** (`app/home/[account]/inventory-chat/page.tsx`)
- Route: `/home/[account]/inventory-chat`
- Team account context
- Full-height chat interface
- Accessible from team account sidebar (when teams are enabled)

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# QuickBooks Desktop (via Conductor)
CONDUCTOR_API_KEY=sk_conductor_your_key_here
CONDUCTOR_END_USER_ID=end_usr_your_id_here

# OpenAI (for natural language processing)
OPENAI_API_KEY=sk-your_openai_key_here
```

**Get Conductor Credentials:**
1. Sign up at [https://dashboard.conductor.is](https://dashboard.conductor.is)
2. Create an API key
3. Connect QuickBooks Desktop via Conductor Desktop Connector
4. Get your `endUserId` from the dashboard

**Get OpenAI API Key:**
1. Sign up at [https://platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Create a new API key

### 2. Dependencies

The following packages are required (already installed):
- `openai` - OpenAI SDK for natural language processing
- `conductor-node` - Conductor SDK for QuickBooks Desktop integration

### 3. QuickBooks Desktop Setup

Ensure QuickBooks Desktop is:
- Running on your machine
- Connected via Conductor Desktop Connector
- The correct company file is open
- Not in single-user mode (must be multi-user mode)

## Usage

### Accessing the Chat

**From Personal Account (Default):**
1. Log in to your account
2. Click "Inventory Chat" in the sidebar
3. Start typing commands in natural language

**From Team Account (If Enabled):**
1. Navigate to your team account
2. Click "Inventory Chat" in the team sidebar
3. Start typing commands in natural language

### Supported Operations

#### Create Inventory Item

**Note:** Creating items requires account IDs (income, COGS, asset). The chat will prompt you if these are missing.

```
"Create a new item called Widget"
"Add inventory item Gadget, SKU GAD-001, cost $30, sell for $60"
"Create item Kitchen Cabinet with barcode 123456"
```

**Required for creation:**
- Item name
- Income account ID
- COGS account ID
- Asset account ID

**Optional fields:**
- SKU, barcode
- Sales price, purchase cost
- Sales/purchase descriptions
- Quantity on hand, reorder point
- Vendor, class, parent item
- Tax codes

#### List Inventory Items

```
"Show me all items"
"List active items"
"Show items containing 'Widget'"
"List items starting with 'Kitchen'"
```

**Supported filters:**
- Status (active/inactive/all)
- Name contains/starts with/ends with
- Class IDs
- Date ranges

#### Read Single Item

```
"Show me item with ID 80000001-1234567890"
"Get details for Widget"
"Show me information about Gadget"
```

If searching by name returns multiple matches, the chat will list them and ask you to specify the exact item ID.

#### Update Inventory Item

```
"Update Widget price to $75"
"Change Gadget SKU to GAD-002"
"Deactivate the Cabinet item"
"Set reorder point to 10 for Widget"
```

The system automatically:
- Finds the item by ID or name
- Retrieves the current revision number
- Applies the update
- Handles conflicts if item changed since last read

### Example Conversations

**Example 1: Simple Update**
```
User: Update Widget price to $75
Bot: ✓ Successfully updated Widget! The sales price is now set to $75.00.
```

**Example 2: Creating Item (Missing Account IDs)**
```
User: Create a new item called Super Widget with price $100
Bot: ✗ To create an inventory item, I need the following account IDs from your QuickBooks Desktop:
- Income Account ID (for sales revenue tracking)
- COGS Account ID (for cost of goods sold)
- Asset Account ID (for inventory asset tracking)

Please provide these IDs or create the item directly in QuickBooks Desktop.
```

**Example 3: Ambiguous Search**
```
User: Update Widget
Bot: ✓ I found 3 items matching "Widget". Please specify which one:
1. Widget (ID: 80000001-1234567890)
2. Widget Pro (ID: 80000002-1234567890)
3. Super Widget (ID: 80000003-1234567890)
```

## API Operations

### List Items
- Fetches paginated inventory items
- Supports extensive filtering
- Default limit: 150 items

### Get Item
- Retrieves single item by ID
- Returns full item details including:
  - Pricing and costs
  - Quantity metrics
  - Account references
  - Custom fields

### Create Item
- Creates new inventory item
- Validates required fields
- Returns created item with ID

### Update Item
- Updates existing item
- Requires revision number (optimistic locking)
- Supports partial updates

### Important Notes

**Quantity Management:**
- To change `quantityOnHand`, use inventory adjustments (not direct updates)
- The chat currently doesn't support inventory adjustments
- Users should use QuickBooks Desktop directly for quantity changes

**Revision Numbers:**
- Required for all updates
- Prevents concurrent modification conflicts
- System automatically retrieves latest revision

**Account IDs:**
- Required for creating items
- Must exist in QuickBooks
- Cannot be automatically discovered (must be provided by user)

## Error Handling

The system handles various error scenarios:

**Connection Errors:**
- QuickBooks Desktop not running
- Wrong company file open
- Conductor connection issues

**Validation Errors:**
- Missing required fields
- Invalid field formats
- Field length violations

**Business Logic Errors:**
- Item not found
- Multiple matches (ambiguous)
- Stale revision number
- Duplicate item names

**User-Friendly Messages:**
All errors are translated into clear, actionable messages for users.

## File Structure

```
apps/web/
├── app/
│   └── home/
│       ├── (user)/                            # Personal account (default)
│       │   └── inventory-chat/
│       │       ├── page.tsx                   # Main page
│       │       ├── _components/
│       │       │   ├── chat-message.tsx       # Message display
│       │       │   ├── chat-input-form.tsx    # Input form
│       │       │   └── inventory-chat-container.tsx  # Main container
│       │       └── _lib/
│       │           └── server/
│       │               └── server-actions.ts  # Server actions
│       └── [account]/                         # Team account (when enabled)
│           └── inventory-chat/
│               ├── page.tsx                   # Team page
│               ├── _components/
│               │   ├── chat-message.tsx       # Message display
│               │   ├── chat-input-form.tsx    # Input form
│               │   └── inventory-chat-container.tsx  # Main container
│               └── _lib/
│                   └── server/
│                       └── server-actions.ts  # Server actions
├── lib/
│   └── quickbooks/
│       ├── inventory.service.ts        # Inventory CRUD service
│       ├── inventory-schemas.ts        # Zod schemas
│       └── openai.service.ts          # Natural language processing
├── config/
│   ├── paths.config.ts                        # Route paths
│   ├── personal-account-navigation.config.tsx # Personal sidebar navigation
│   └── team-account-navigation.config.tsx     # Team sidebar navigation
└── public/
    └── locales/
        └── en/
            ├── common.json                    # Route labels
            ├── account.json                   # Personal account translations
            └── teams.json                     # Team account translations
```

## Security Considerations

1. **Environment Variables:**
   - Never commit API keys to version control
   - Keep `.env` file in `.gitignore`
   - Use separate keys for development/production

2. **Authorization:**
   - Chat is only accessible within team accounts
   - All operations use the configured `CONDUCTOR_END_USER_ID`
   - Conductor API handles QuickBooks-level permissions

3. **Input Validation:**
   - All inputs validated with Zod schemas
   - Server-side validation before API calls
   - OpenAI structured outputs ensure valid data extraction

4. **Rate Limiting:**
   - Consider implementing rate limits for OpenAI calls
   - Monitor API usage for both OpenAI and Conductor
   - Set appropriate timeouts

## Limitations

1. **Account IDs:** Users must provide account IDs for item creation (cannot be auto-discovered)
2. **Quantity Changes:** Must use inventory adjustments (not yet implemented in chat)
3. **Batch Operations:** Single item operations only (no bulk updates)
4. **Complex Queries:** Limited to basic filters (no complex SQL-like queries)
5. **History:** Chat history not persisted (resets on page reload)

## Future Enhancements

Potential additions:

- [ ] Persistent chat history (store in database)
- [ ] Support for inventory adjustments
- [ ] Batch operations (create/update multiple items)
- [ ] Account ID lookup/search
- [ ] Rich item display (images, detailed tables)
- [ ] Export chat conversations
- [ ] Voice input support
- [ ] Suggested commands/autocomplete
- [ ] Analytics and insights
- [ ] Integration with other QuickBooks entities (vendors, classes)

## Troubleshooting

### "QuickBooks Desktop connection is not configured"
- Check that `CONDUCTOR_END_USER_ID` is set in `.env`
- Verify Conductor Desktop Connector is running
- Ensure correct company file is open

### "Failed to parse message with OpenAI"
- Check that `OPENAI_API_KEY` is valid
- Verify OpenAI API is accessible
- Check API usage limits

### "Item not found"
- Verify item exists in QuickBooks
- Try searching by exact item ID
- Check item is not deleted/inactive

### Chat is slow
- OpenAI API calls can take 2-5 seconds
- Conductor API responses vary based on QB Desktop load
- Consider implementing loading indicators

### Updates fail with "revision number" error
- Item was modified between read and update
- System automatically retries with fresh revision
- If persists, reload and try again

## Resources

- [Conductor Documentation](https://docs.conductor.is)
- [Conductor Dashboard](https://dashboard.conductor.is)
- [OpenAI Platform](https://platform.openai.com)
- [QuickBooks Desktop API Reference](https://docs.conductor.is/api-ref/qbd/inventory-items)

## Support

For issues:
- **Conductor SDK:** Visit [Conductor Docs](https://docs.conductor.is)
- **OpenAI:** Check [OpenAI Documentation](https://platform.openai.com/docs)
- **QuickBooks Desktop:** Refer to Intuit's documentation
- **This Implementation:** See main project README
