import { FormProps } from "antd";
import { useState } from "react";

export default function useForm() {
    const [test, setTest] = useState(false);
    return { test, setTest };
}
