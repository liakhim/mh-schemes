import { getOneWirePortColor } from '../scheme/layout/oneWireRendering';
import { Line } from '../scheme/rendering/SharpLine';

const OneWireLine = ({ segments }) => (
    <>
        {segments.map(({ key, role, points }) => (
            <Line
                key={key}
                points={points}
                stroke={getOneWirePortColor(role)}
                strokeWidth={1}
                lineCap="round"
                lineJoin="round"
                listening={false}
            />
        ))}
    </>
);

export default OneWireLine;
