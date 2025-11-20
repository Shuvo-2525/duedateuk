import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error: Missing API Key" },
      { status: 500 }
    );
  }

  try {
    // Call Companies House API with Basic Auth
    // The username is the API Key, password is empty string
    const response = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
        },
      }
    );

    if (response.status === 404) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data from Companies House" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return only the fields we need
    return NextResponse.json({
      companyName: data.company_name,
      accountsNextDue: data.accounts?.next_made_up_to || data.accounts?.next_due || "",
      confirmationStatementNextDue: data.confirmation_statement?.next_made_up_to || data.confirmation_statement?.next_due || "",
      status: data.company_status,
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}