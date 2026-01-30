import React from 'react';

export default function SupportedVersions() {
  const versions = [
    { number: 'v4.6', releaseDate: '2025-09-09' },
    { number: 'v4.5', releaseDate: '2025-02-20' },
    { number: 'v4.4', releaseDate: '2024-11-12' },
    { number: 'v4.3', releaseDate: '2023-12-22' },
    // The following need to specify an end of life date because it
    // is not 18 months from the release date.
    { number: 'v4.2', releaseDate: '2023-09-29', eolDate: '2025-03-29' },
    { number: 'v4.1', releaseDate: '2023-06-29', eolDate: '2024-12-29' },
    { number: 'v4.0', releaseDate: '2023-05-08', eolDate: '2024-11-08' },
    { number: 'v3.4', releaseDate: '2023-04-21', eolDate: '2024-10-21' },
    { number: 'v3.3', releaseDate: '2023-01-24', eolDate: '2024-07-24' },
    { number: 'v3.2', releaseDate: '2022-08-18', eolDate: '2024-02-18' },
    { number: 'v3.1', releaseDate: '2021-09-10', eolDate: '2023-03-10' },
    { number: 'v3.0', releaseDate: '2021-04-20', eolDate: '2022-10-20' },
    { number: 'v2.11', releaseDate: '2020-10-23', eolDate: '2022-04-23' },
    { number: 'v2.10', releaseDate: '2020-01-15', eolDate: '2021-07-15' },
    { number: 'v2.9', releaseDate: '2019-07-16', eolDate: '2021-01-16' },
    { number: 'v2.8', releaseDate: '2019-01-29', eolDate: '2020-07-29' },
    { number: 'v2.7', releaseDate: '2018-09-14', eolDate: '2020-03-14' },
    { number: 'v2.6', releaseDate: '2018-06-16', eolDate: '2019-12-16' },
    { number: 'v2.5', releaseDate: '2018-03-27', eolDate: '2019-09-27' },
    { number: 'v2.4', releaseDate: '2017-11-07', eolDate: '2019-05-07' }
  ];

  // add 18 months to the release date to get the end of life date
  const eolDate = (releaseDate) => {
    const oneMonth = 30 * 24 * 60 * 60 * 1000
    return (new Date(new Date(releaseDate).getTime() + 18 * oneMonth)).toISOString().split("T")[0]
  }

  versions.forEach(version => version.eolDate = version.eolDate || eolDate(version.releaseDate))

  return (
    <div className="supported_versions">
      <table>
        <thead>
          <tr>
            <th>Version Number</th>
            <th>Release Date</th>
            <th>End of Life Date</th>
            <th>Supported</th>
          </tr>
        </thead>
        <tbody>
          {versions.map(version => (
            <tr
              key={version.number}
            >
              <td>{version.number}</td>
              <td>{version.releaseDate}</td>
              <td>{version.eolDate}</td>
              <td>{isSupported(version.eolDate) ? '✅' : '⛔️'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Function to check if a version is still supported based on the end of life date
function isSupported(eolDate) {
  const endOfLifeDateTime = new Date(eolDate).getTime();
  return Date.now() < endOfLifeDateTime;
}
